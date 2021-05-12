import { Injectable } from '@angular/core';
import { IResultList, Client } from '@c8y/client';
import { ServerSideDataResult, Column, Pagination, DataSourceModifier } from '@c8y/ngx-components';
import { DeviceDetailsService } from '@services/device-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Injectable()
export class FirmwareStatisticsTableDatasourceService {
  serverSideDataCallback: Promise<ServerSideDataResult>;
  columns: Column[];

  pagination: Pagination = {
    pageSize: 50,
    currentPage: 1
  };

  private cachedPromise: Promise<
    {
      version: string;
      count: number;
      percentage: string;
    }[]
  >;

  constructor(private credService: FakeMicroserviceService, private deviceDetailsService: DeviceDetailsService) {
    this.serverSideDataCallback = this.onDataSourceModifier.bind(this);
  }

  async onDataSourceModifier(dataSourceModifier: DataSourceModifier): Promise<ServerSideDataResult> {
    this.columns = [...(dataSourceModifier.columns || [])];
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = this.credService.createClients(credentials);

    const firmwareVersions = await this.fetchForPageCached(clients);

    const start = 0 + dataSourceModifier.pagination.pageSize * (dataSourceModifier.pagination.currentPage - 1);
    const dataSubset = firmwareVersions.slice(start, start + dataSourceModifier.pagination.pageSize);
    const resList: IResultList<{
      version: string;
      count: number;
      percentage: string;
    }> = {
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
      size: firmwareVersions.length,
      filteredSize: firmwareVersions.length,
      ...resList
    };

    return result;
  }

  fetchForPageCached(clients: Client[]): Promise<
    {
      version: string;
      count: number;
      percentage: string;
    }[]
  > {
    if (!this.cachedPromise) {
      this.cachedPromise = this.fetchForPage(clients);
    }
    return this.cachedPromise;
  }

  private async fetchForPage(clients: Client[]): Promise<
    {
      version: string;
      count: number;
      percentage: string;
    }[]
  > {
    const result = await this.deviceDetailsService.getFirmwareStatisticsOfTenants(clients);
    const resArr = Array.from(result);
    const totalEntries = resArr.map((tmp) => tmp[1]).reduce((prev, curr) => prev + curr);
    return resArr
      .map((tmp) => {
        return {
          version: tmp[0],
          count: tmp[1],
          percentage: totalEntries ? ((tmp[1] / totalEntries) * 100).toFixed(2) + '%' : '--'
        };
      })
      .sort((a, b) => b.count - a.count);
  }
}
