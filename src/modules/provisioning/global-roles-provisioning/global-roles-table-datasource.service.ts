import { Injectable } from '@angular/core';
import { IResultList, IUserGroup, UserGroupService } from '@c8y/client';
import { ServerSideDataResult, Column, Pagination, DataSourceModifier } from '@c8y/ngx-components';

@Injectable()
export class GlobalRolesTableDatasourceService {
  serverSideDataCallback: Promise<ServerSideDataResult>;
  columns: Column[];

  pagination: Pagination = {
    pageSize: 50,
    currentPage: 1
  };

  constructor(private groups: UserGroupService) {
    this.serverSideDataCallback = this.onDataSourceModifier.bind(this);
  }

  async onDataSourceModifier(dataSourceModifier: DataSourceModifier): Promise<ServerSideDataResult> {
    this.columns = [...(dataSourceModifier.columns || [])];

    const [resList, count] = await Promise.all([this.fetchForPage(dataSourceModifier), this.fetchCount()]);

    const result: ServerSideDataResult = {
      size: undefined,
      filteredSize: count,
      ...resList
    };

    return result;
  }

  private async fetchForPage(dataSourceModifier: DataSourceModifier): Promise<IResultList<IUserGroup>> {
    const filter = {
      pageSize: dataSourceModifier.pagination.pageSize,
      currentPage: dataSourceModifier.pagination.currentPage
    };
    return this.groups.list(filter);
  }

  /**
   * Returns the complete count of items. Use wisely ond only if really necessary as the calculation of the count is expensive on server-side.
   * @param query
   */
  private fetchCount(): Promise<number> {
    const filters = {
      pageSize: 1,
      currentPage: 1,
      withTotalPages: true
    };
    return this.groups.list(filters).then((result) => result.paging.totalPages);
  }
}
