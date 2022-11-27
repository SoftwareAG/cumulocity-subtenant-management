import { Injectable } from '@angular/core';
import { IResultList, Client, IOperation } from '@c8y/client';
import { ServerSideDataResult, Column, Pagination, DataSourceModifier } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { get } from 'lodash-es';

@Injectable()
export class FirmwareUpdateHistoryTableDatasourceService {
  serverSideDataCallback: Promise<ServerSideDataResult>;
  columns: Column[];

  pagination: Pagination = {
    pageSize: 50,
    currentPage: 1
  };

  private tenantFilter: string = null;
  private cachedPromise: Promise<TenantSpecificDetails<IOperation>[]>;

  constructor(private credService: FakeMicroserviceService) {
    this.serverSideDataCallback = this.onDataSourceModifier.bind(this);
  }

  async onDataSourceModifier(dataSourceModifier: DataSourceModifier): Promise<ServerSideDataResult> {
    this.columns = [...(dataSourceModifier.columns || [])];

    const filteredColumns = dataSourceModifier.columns.filter((tmp) => !!tmp.filterPredicate);
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    let clients = await this.credService.createClients(credentials);
    const tenantIdCol = dataSourceModifier.columns.find((tmp) => tmp.path === 'tenantId');

    if (tenantIdCol) {
      if (this.tenantFilter !== tenantIdCol.filterPredicate) {
        this.cachedPromise = null;
      }
      if (tenantIdCol.filterPredicate) {
        clients = clients.filter((tmp) => tmp.core.tenant.includes(tenantIdCol.filterPredicate as string));
      }
      this.tenantFilter = tenantIdCol.filterPredicate as string;
    }

    const operations = await this.fetchForPage(clients);

    let filteredOperations = operations;
    if (filteredColumns.length) {
      filteredOperations = operations.filter((user) => {
        return !filteredColumns.some((col) => {
          const property: string = get(user, col.path);
          if (property && property.includes(col.filterPredicate as string)) {
            return false;
          }
          return true;
        });
      });
    }

    const start = 0 + dataSourceModifier.pagination.pageSize * (dataSourceModifier.pagination.currentPage - 1);
    const dataSubset = filteredOperations.slice(start, start + dataSourceModifier.pagination.pageSize);
    const resList: IResultList<TenantSpecificDetails<IOperation>> = {
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
      filteredSize: filteredOperations.length,
      ...(resList as any)
    };

    return result;
  }

  private async fetchForPage(clients: Client[]): Promise<TenantSpecificDetails<IOperation>[]> {
    let promise = this.cachedPromise;
    if (!promise) {
      const currentDate = new Date();
      const filter = {
        pageSize: 50,
        fragmentType: 'c8y_Firmware',
        dateTo: currentDate.toISOString(),
        revert: true
      };
      const promArray = clients.map((client) => {
        return client.operation.list(filter).then((res) => {
          return res.data.map((entry) => {
            return {
              data: entry,
              tenantId: client.core.tenant
            } as TenantSpecificDetails<IOperation>;
          });
        });
      });
      promise = Promise.all(promArray).then((result) => {
        const array = new Array<TenantSpecificDetails<IOperation>>();
        result.forEach((entry) => array.push(...entry));
        return array.sort((a, b) => ((b.data.creationTime as string) || '').localeCompare(a.data.creationTime || ''));
      });
      this.cachedPromise = promise;
    }
    return promise;
  }
}
