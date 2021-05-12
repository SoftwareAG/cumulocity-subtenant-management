import { Injectable } from '@angular/core';
import { QueriesUtil, InventoryService, IResultList, IManagedObject } from '@c8y/client';
import { ServerSideDataResult, Column, Pagination, DataSourceModifier } from '@c8y/ngx-components';

@Injectable()
export class SmartrestTableDatasourceService {
  serverSideDataCallback: Promise<ServerSideDataResult>;
  columns: Column[];

  pagination: Pagination = {
    pageSize: 40,
    currentPage: 1
  };

  private readonly queriesUtil = new QueriesUtil();
  /**
   * The query to be used if the table loads without any column filters.
   */
  private BASE_QUERY = {
    type: 'c8y_SmartRest2Template'
    // __has: 'com_cumulocity_model_smartrest_SmartRestTemplate'
  };

  constructor(private inventoryService: InventoryService) {
    this.serverSideDataCallback = this.onDataSourceModifier.bind(this);
  }

  async onDataSourceModifier(dataSourceModifier: DataSourceModifier): Promise<ServerSideDataResult> {
    this.columns = [...(dataSourceModifier.columns || [])];
    console.log(this.columns);

    const filterQuery = this.createQueryFilter(dataSourceModifier.columns);
    const allQuery = this.createQueryFilter([]);

    const devices = this.fetchForPage(filterQuery, dataSourceModifier.pagination);
    const filtered = this.fetchCount(filterQuery);
    const total = this.fetchCount(allQuery);
    const [devicesResponse, filteredSize, size] = await Promise.all([devices, filtered, total]);

    const result: ServerSideDataResult = {
      size,
      filteredSize,
      ...devicesResponse
    };

    return result;
  }

  private fetchForPage(query: Record<string, unknown>, pagination: Pagination): Promise<IResultList<IManagedObject>> {
    const filters = {
      ...query,
      withParents: true,
      pageSize: pagination.pageSize,
      currentPage: pagination.currentPage,
      withTotalPages: false
    };
    return this.inventoryService.list(filters);
  }

  /**
   * Returns the complete count of items. Use wisely ond only if really necessary as the calculation of the count is expensive on server-side.
   * @param query
   */
  private fetchCount(query: Record<string, unknown>): Promise<number> {
    const filters = {
      ...query,
      pageSize: 1,
      currentPage: 1,
      withTotalPages: true
    };
    return this.inventoryService.list(filters).then((result) => result.paging.totalPages);
  }

  private createQueryFilter(columns: Column[]): { query: string } {
    const query = columns.reduce(this.extendQueryByColumn, {
      __filter: this.BASE_QUERY,
      __orderby: []
    });
    const smartRESTQuery = `(type eq 'c8y_SmartRest2Template' or has(com_cumulocity_model_smartrest_SmartRestTemplate) or has(com_cumulocity_model_smartrest_csv_CsvSmartRestTemplate))`;

    let queryString = this.queriesUtil.buildQuery(query);
    queryString = queryString.replace(`(type eq 'c8y_SmartRest2Template')`, smartRESTQuery);

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
