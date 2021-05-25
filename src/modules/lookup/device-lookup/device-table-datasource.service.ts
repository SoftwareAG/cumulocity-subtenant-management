import { Inject, Injectable, Optional } from '@angular/core';
import { QueriesUtil, IResultList, IManagedObject, Client } from '@c8y/client';
import { ServerSideDataResult, Column, Pagination, DataSourceModifier } from '@c8y/ngx-components';
import { DeviceActionsFactory, HOOK_DEVICE_ACTION_FACTORY } from '@models/extensions';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { DeviceDetailsService } from '@services/device-details.service';
import { ExtensionsService } from '@services/extensions.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { flatMap } from 'lodash-es';

@Injectable()
export class DeviceTableDatasourceService {
  serverSideDataCallback: Promise<ServerSideDataResult>;
  columns: Column[];

  pagination: Pagination = {
    pageSize: 50,
    currentPage: 1
  };

  private readonly queriesUtil = new QueriesUtil();
  /**
   * The query to be used if the table loads without any column filters.
   */
  private BASE_QUERY = {
    __has: 'c8y_IsDevice'
  };

  private previousQuery = '';
  private previousTenant = '';
  private cachedPromise: Promise<TenantSpecificDetails<IManagedObject>[]>;
  private deviceActionFactories: DeviceActionsFactory[] = [];

  constructor(
    private credService: FakeMicroserviceService,
    private deviceDetailsService: DeviceDetailsService,
    private extensionService: ExtensionsService
  ) {
    this.deviceActionFactories = this.extensionService.getDeviceActionFactories();
    this.serverSideDataCallback = this.onDataSourceModifier.bind(this);
  }

  async onDataSourceModifier(dataSourceModifier: DataSourceModifier): Promise<ServerSideDataResult> {
    this.columns = [...(dataSourceModifier.columns || [])];
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    let clients = this.credService.createClients(credentials);
    let tenantFilter = '';
    const tenantIdCol = dataSourceModifier.columns.find((tmp) => tmp.path === 'tenantId');
    if (tenantIdCol && tenantIdCol.filterPredicate) {
      clients = clients.filter((tmp) => tmp.core.tenant.includes(tenantIdCol.filterPredicate as string));
      tenantFilter = tenantIdCol.filterPredicate as string;
      tenantIdCol.filterPredicate = undefined;
    }
    const columnsCopy = dataSourceModifier.columns.map((tmp) => Object.assign({}, tmp));

    columnsCopy.forEach((entry) => {
      if (entry && entry.path) {
        entry.path = entry.path.replace('data.', '');
      }
    });

    const filterQuery = this.createQueryFilter(columnsCopy);
    // filterQuery.query = filterQuery.query.replace('(data.', '(');

    const devices = await this.fetchForPage(filterQuery, tenantFilter, clients);
    const start = 0 + dataSourceModifier.pagination.pageSize * (dataSourceModifier.pagination.currentPage - 1);
    const dataSubset = devices.slice(start, start + dataSourceModifier.pagination.pageSize);
    dataSubset.forEach((entry) => {
      const actions = flatMap(this.deviceActionFactories.map((tmp) => tmp.get(entry.data)));
      entry.actions = actions;
    });
    const resList: IResultList<TenantSpecificDetails<IManagedObject>> = {
      data: dataSubset,
      res: undefined,
      // @ts-ignore
      paging: {
        currentPage: dataSourceModifier.pagination.currentPage,
        pageSize: dataSourceModifier.pagination.pageSize,
        nextPage: dataSourceModifier.pagination.currentPage + 1
      }
    };

    const result: ServerSideDataResult = {
      size: undefined,
      filteredSize: devices.length,
      ...resList
    };

    return result;
  }

  private async fetchForPage(
    query: { query: string },
    tenantFilter: string,
    clients: Client[]
  ): Promise<TenantSpecificDetails<IManagedObject>[]> {
    let promise = this.cachedPromise;
    if (!promise || this.previousQuery !== query.query || this.previousTenant !== tenantFilter) {
      promise = this.deviceDetailsService.deviceLookup(clients, query.query);
      this.previousQuery = query.query;
      this.previousTenant = tenantFilter;
      this.cachedPromise = promise;
    }
    return promise;
    // return this.inventoryService.list(filters);
  }

  private createQueryFilter(columns: Column[]): { query: string } {
    const query = columns.reduce(this.extendQueryByColumn, {
      __filter: this.BASE_QUERY,
      __orderby: []
    });
    const queryString = this.queriesUtil.buildQuery(query);

    return { query: queryString };
  }

  private extendQueryByColumn = (query: any, column: Column) => {
    if (column.filterable && column.filterPredicate) {
      const queryObj: any = {};
      queryObj[column.path] = column.filterPredicate;
      query.__filter = { ...query.__filter, ...queryObj };
    }

    if (column.filterable && column.externalFilterQuery) {
      query.__filter = { ...query.__filter, ...column.externalFilterQuery };
    }

    if (column.sortable && column.sortOrder) {
      const cs: any = {};
      cs[column.path] = column.sortOrder === 'asc' ? 1 : -1;
      query.__orderby.push(cs);
    }

    return query;
  };
}
