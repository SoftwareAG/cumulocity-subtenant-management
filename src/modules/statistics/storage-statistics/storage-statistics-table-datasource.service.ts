import { Injectable } from '@angular/core';
import { IResultList, ITenant, TenantStatus, Client, Service, IFetchResponse } from '@c8y/client';
import { ServerSideDataResult, Column, Pagination, DataSourceModifier } from '@c8y/ngx-components';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { SubtenantDetailsService } from '@services/subtenant-details.service';

@Injectable()
export class StorageStatisticsTableDatasourceService {
  serverSideDataCallback: (dataSourceModifier: DataSourceModifier) => Promise<ServerSideDataResult>;
  columns: Column[] = [];

  pagination: Pagination = {
    pageSize: 50,
    currentPage: 1
  };

  constructor(private tenantService: SubtenantDetailsService, private credService: FakeMicroserviceService) {
    this.serverSideDataCallback = this.onDataSourceModifier.bind(this);
  }

  async onDataSourceModifier(dataSourceModifier: DataSourceModifier): Promise<ServerSideDataResult> {
    this.columns = [...(dataSourceModifier.columns || [])];
    // const tenantIdCol = dataSourceModifier.columns.find((tmp) => tmp.path === 'tenantId');

    // const filterQuery = this.createQueryFilter(columnsCopy);
    // filterQuery.query = filterQuery.query.replace('(data.', '(');

    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const selectedTenantIds = credentials.map((tmp) => tmp.tenant);
    const clients = await this.credService.createClients(credentials);
    // const credentialsOfTenant = credentials.find((tmp) => tmp.tenant === tenant.id);

    const allTenants = await this.tenantService.getCachedTenants();
    const filteredTenants = allTenants.filter((tmp) => selectedTenantIds.includes(tmp.id));

    const currentPage = dataSourceModifier.pagination.currentPage as number;

    const start = 0 + dataSourceModifier.pagination.pageSize * (currentPage - 1);
    const dataSubset = filteredTenants.slice(start, start + dataSourceModifier.pagination.pageSize);

    const visibleColumns = dataSourceModifier.columns
      .filter((tmp) => tmp.visible !== false && tmp.name)
      .map((tmp) => tmp.name);
    const statistics = await Promise.all(
      dataSubset.map((tenant) =>
        this.fetchStorageStatistics(
          visibleColumns,
          tenant,
          clients.find((tmp) => tmp.core.tenant === tenant.id) as Client
        )
      )
    );

    const resList: IResultList<ITenant> = {
      data: statistics,
      res: undefined as unknown as IFetchResponse,
      // @ts-ignore
      paging: {
        currentPage: currentPage,
        pageSize: dataSourceModifier.pagination.pageSize,
        nextPage: currentPage + 1
      }
    };

    const result: ServerSideDataResult = {
      size: allTenants.length,
      filteredSize: credentials.length,
      ...(resList as any)
    };

    return result;
  }

  private async fetchStorageStatistics(activeColumns: string[], tenant: ITenant, client: Client) {
    const partialTenant: Partial<ITenant & {[key: string]: any}> = {
      id: tenant.id,
      domain: tenant.domain
    };
    if (tenant.status === TenantStatus.ACTIVE && activeColumns.length) {
      try {
        const promArray = activeColumns
          .filter((tmp) => tmp.includes('Count'))
          .map((tmp) => {
            if (tmp === 'inventoryBinaryCount') {
              const filter = {
                query: `has(c8y_IsBinary)`
              };
              return this.fetchCount(client.inventory.list.bind(client.inventory), filter).then((result) => {
                partialTenant[tmp] = result;
              });
            }
            const api = tmp.replace('Count', '') as keyof Client;
            const service = client[api] as Service<any>;
            return this.fetchCount(service.list.bind(service)).then((result) => {
              partialTenant[tmp] = result;
            });
          });
        if (activeColumns.find((tmp) => tmp === 'binarySizeSum')) {
          promArray.push(
            this.getTotalBinarySize(client).then((result) => {
              partialTenant['binarySizeSum'] = result;
            })
          );
        }
        await Promise.all(promArray);
        return partialTenant;
      } catch (e) {}
    }
    return partialTenant;
  }

  private async getTotalBinarySize(client: Client): Promise<number> {
    let byteSum = 0;
    const filter = {
      pageSize: 2000,
      query: `has(c8y_IsBinary) and has(length)`
    };
    const res = await client.inventory.list(filter);
    // while (res.data.length) {
    const sum = res.data.map((tmp) => tmp['length'] || 0).reduceRight((prev, curr) => prev + curr, 0);
    byteSum += sum;
    //   if (res.data.length < res.paging.pageSize) {
    //     break;
    //   }
    //   res = await res.paging.next();
    // }
    return byteSum;
  }

  private fetchCount(list: (filter?: any) => Promise<IResultList<any>>, filter?: any): Promise<number> {
    const filters = Object.assign(filter || {}, {
      pageSize: 1,
      currentPage: 1,
      withTotalPages: true
    });

    return list(filters).then((result) => result.paging?.totalPages as number);
  }
}
