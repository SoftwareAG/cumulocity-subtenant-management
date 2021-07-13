import { Injectable } from '@angular/core';
import { IResultList, IManagedObject, InventoryService } from '@c8y/client';
import { ServerSideDataResult, Column, Pagination, DataSourceModifier } from '@c8y/ngx-components';

@Injectable()
export class SmartGroupTableDatasourceService {
  serverSideDataCallback: Promise<ServerSideDataResult>;
  columns: Column[];
  baseFilter = {
    fragmentType: 'c8y_IsDynamicGroup'
  };

  pagination: Pagination = {
    pageSize: 50,
    currentPage: 1
  };

  constructor(private inventory: InventoryService) {
    this.serverSideDataCallback = this.onDataSourceModifier.bind(this);
  }

  async onDataSourceModifier(dataSourceModifier: DataSourceModifier): Promise<ServerSideDataResult> {
    this.columns = [...(dataSourceModifier.columns || [])];

    const [resList, count] = await Promise.all([this.fetchForPage(dataSourceModifier), this.fetchCount()]);

    const result: ServerSideDataResult = {
      size: undefined,
      filteredSize: count,
      ...(resList as any)
    };

    return result;
  }

  private async fetchForPage(dataSourceModifier: DataSourceModifier): Promise<IResultList<IManagedObject>> {
    const filter = {
      pageSize: dataSourceModifier.pagination.pageSize,
      currentPage: dataSourceModifier.pagination.currentPage
    };
    return this.inventory.list(Object.assign(filter, this.baseFilter));
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
    return this.inventory.list(Object.assign(filter, this.baseFilter)).then((result) => result.paging.totalPages);
  }
}
