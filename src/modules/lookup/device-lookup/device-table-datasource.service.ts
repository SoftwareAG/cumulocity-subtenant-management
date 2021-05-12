import { Injectable } from '@angular/core';
import { QueriesUtil, IResultList, IManagedObject, Client } from '@c8y/client';
import { ServerSideDataResult, Column, Pagination, DataSourceModifier } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { DeviceDetailsService } from '@services/device-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

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
  private cachedPromise: Promise<TenantSpecificDetails<Partial<IManagedObject>>[]>;

  constructor(private credService: FakeMicroserviceService, private deviceDetailsService: DeviceDetailsService) {
    this.serverSideDataCallback = this.onDataSourceModifier.bind(this);
  }

  async onDataSourceModifier(dataSourceModifier: DataSourceModifier): Promise<ServerSideDataResult> {
    this.columns = [...(dataSourceModifier.columns || [])];

    const filterQuery = this.createQueryFilter(dataSourceModifier.columns);
    filterQuery.query = filterQuery.query.replace('(data.', '(');
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = this.credService.createClients(credentials);

    const devices = await this.fetchForPage(filterQuery, clients);
    const start = 0 + dataSourceModifier.pagination.pageSize * (dataSourceModifier.pagination.currentPage - 1);
    const dataSubset = devices.slice(start, start + dataSourceModifier.pagination.pageSize);
    const resList: IResultList<TenantSpecificDetails<Partial<IManagedObject>>> = {
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
    clients: Client[]
  ): Promise<TenantSpecificDetails<Partial<IManagedObject>>[]> {
    let promise = this.cachedPromise;
    if (!promise || this.previousQuery !== query.query) {
      promise = this.deviceDetailsService.deviceLookup(clients, query.query);
      this.previousQuery = query.query;
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
