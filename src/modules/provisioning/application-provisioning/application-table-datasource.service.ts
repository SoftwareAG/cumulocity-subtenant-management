import { Injectable } from '@angular/core';
import { IResultList, IApplication, ApplicationService } from '@c8y/client';
import { ServerSideDataResult, Column, Pagination, DataSourceModifier } from '@c8y/ngx-components';
import { ApplicationSubscriptionService } from '@services/application-subscription.service';
import { SubtenantDetailsService } from '@services/subtenant-details.service';

@Injectable()
export class ApplicationTableDatasourceService {
  serverSideDataCallback: Promise<ServerSideDataResult>;
  columns: Column[];

  pagination: Pagination = {
    pageSize: 50,
    currentPage: 1
  };

  constructor(
    private applicationService: ApplicationService,
    private subtenantService: SubtenantDetailsService,
    private applicationSubService: ApplicationSubscriptionService
  ) {
    this.serverSideDataCallback = this.onDataSourceModifier.bind(this);
  }

  async onDataSourceModifier(dataSourceModifier: DataSourceModifier): Promise<ServerSideDataResult> {
    this.columns = [...(dataSourceModifier.columns || [])];

    const [resList, count, tenants] = await Promise.all([
      this.fetchForPage(dataSourceModifier),
      this.fetchCount(),
      this.subtenantService.getTenants()
    ]);
    resList.data.forEach((app) => {
      const numberOfTenantsHavingTheApp = tenants
        .map((tenant) => this.applicationSubService.hasApp(tenant, app))
        .filter((tmp) => !!tmp).length;

      app['numberOfTenantsHavingTheApp'] = numberOfTenantsHavingTheApp;
    });

    const result: ServerSideDataResult = {
      size: undefined,
      filteredSize: count,
      ...(resList as any)
    };

    return result;
  }

  private async fetchForPage(dataSourceModifier: DataSourceModifier): Promise<IResultList<IApplication>> {
    const filter = {
      pageSize: dataSourceModifier.pagination.pageSize,
      currentPage: dataSourceModifier.pagination.currentPage
    };
    return this.applicationService.list(filter);
  }

  /**
   * Returns the complete count of items. Use wisely ond only if really necessary as the calculation of the count is expensive on server-side.
   * @param query
   */
  private fetchCount(): Promise<number> {
    const filter = {
      pageSize: 1,
      currentPage: 1,
      withTotalPages: true
    };
    return this.applicationService.list(filter).then((result) => result.paging.totalPages);
  }
}
