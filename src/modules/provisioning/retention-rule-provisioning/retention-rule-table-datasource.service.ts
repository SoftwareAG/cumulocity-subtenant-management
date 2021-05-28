import { Injectable } from '@angular/core';
import { IResultList, Client } from '@c8y/client';
import { ServerSideDataResult, Column, Pagination, DataSourceModifier } from '@c8y/ngx-components';
import { IRetention } from '@models/Retention';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { get } from 'lodash-es';

@Injectable()
export class RetentionRuleTableDatasourceService {
  serverSideDataCallback: Promise<ServerSideDataResult>;
  columns: Column[];

  pagination: Pagination = {
    pageSize: 50,
    currentPage: 1
  };

  private tenantFilter: string = null;
  private cachedPromise: Promise<TenantSpecificDetails<IRetention>[]>;

  constructor(private credService: FakeMicroserviceService) {
    this.serverSideDataCallback = this.onDataSourceModifier.bind(this);
  }

  async onDataSourceModifier(dataSourceModifier: DataSourceModifier): Promise<ServerSideDataResult> {
    this.columns = [...(dataSourceModifier.columns || [])];

    const filteredColumns = dataSourceModifier.columns.filter((tmp) => !!tmp.filterPredicate);
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    let clients = this.credService.createClients(credentials);
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

    const rules = await this.fetchForPage(clients);

    let filteredRules = rules;
    if (filteredColumns.length) {
      filteredRules = rules.filter((user) => {
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
    const dataSubset = filteredRules.slice(start, start + dataSourceModifier.pagination.pageSize);
    const resList: IResultList<TenantSpecificDetails<IRetention>> = {
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
      filteredSize: filteredRules.length,
      ...resList
    };

    return result;
  }

  private async fetchForPage(clients: Client[]): Promise<TenantSpecificDetails<IRetention>[]> {
    let promise = this.cachedPromise;
    if (!promise) {
      const promArray = clients.map((client) => {
        return this.fetchAllRetentionRulesOfTenant(client);
      });
      promise = Promise.all(promArray).then((result) => {
        const array = new Array<TenantSpecificDetails<IRetention>>();
        result.forEach((entry) => array.push(...entry));
        return array;
      });
      this.cachedPromise = promise;
    }
    return promise;
  }

  async fetchAllRetentionRulesOfTenant(client: Client): Promise<TenantSpecificDetails<IRetention>[]> {
    const resArr = new Array<TenantSpecificDetails<IRetention>>();
    const pageSize = 1000;
    let currentPage = 1;
    let path = this.getRetentionRulePath(currentPage, pageSize);
    let result = await this.loadRetentionRules(client, path);
    while (result.data.length) {
      const mappedArr = result.data.map((tmp) => {
        return { data: tmp, tenantId: client.core.tenant } as TenantSpecificDetails<IRetention>;
      });
      resArr.push(...mappedArr);
      if (result.data.length < result.pageSize) {
        break;
      }

      currentPage++;
      path = this.getRetentionRulePath(currentPage, pageSize);
      result = await this.loadRetentionRules(client, path);
    }
    resArr.sort((a, b) => a.data.source.localeCompare(b.data.source));
    return resArr;
  }

  public resetCache(): void {
    this.cachedPromise = null;
  }

  async loadRetentionRules(
    client: Client,
    path: string
  ): Promise<{
    pageSize: number;
    data: IRetention[];
  }> {
    const res = await client.core.fetch(path);
    if (res.status !== 200) {
      throw res;
    }

    const json: {
      statistics: { pageSize: number };
      retentionRules: IRetention[];
    } = await res.json();
    return { pageSize: json.statistics.pageSize, data: json.retentionRules };
  }

  getRetentionRulePath(currentPage: number, pageSize: number): string {
    return `/retention/retentions?pageSize=${pageSize}&currentPage=${currentPage}`;
  }
}
