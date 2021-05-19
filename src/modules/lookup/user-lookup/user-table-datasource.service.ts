import { Injectable } from '@angular/core';
import { IResultList, Client, IUser } from '@c8y/client';
import { ServerSideDataResult, Column, Pagination, DataSourceModifier } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { UserDetailsService } from '@services/user-details.service';
import { get } from 'lodash-es';

@Injectable()
export class UserTableDatasourceService {
  serverSideDataCallback: Promise<ServerSideDataResult>;
  columns: Column[];

  pagination: Pagination = {
    pageSize: 50,
    currentPage: 1
  };

  private cachedPromise: Promise<TenantSpecificDetails<IUser>[]>;

  constructor(private credService: FakeMicroserviceService, private userDetailsService: UserDetailsService) {
    this.serverSideDataCallback = this.onDataSourceModifier.bind(this);
  }

  clearCache(): void {
    this.cachedPromise = undefined;
  }

  async onDataSourceModifier(dataSourceModifier: DataSourceModifier): Promise<ServerSideDataResult> {
    this.columns = [...(dataSourceModifier.columns || [])];

    const filteredColumns = dataSourceModifier.columns.filter((tmp) => !!tmp.filterPredicate);

    // const filterQuery = this.createQueryFilter(dataSourceModifier.columns);
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = this.credService.createClients(credentials);

    const users = await this.fetchForPage(clients);
    let filteredUsers = users;
    if (filteredColumns.length) {
      filteredUsers = users.filter((user) => {
        return !filteredColumns.some((col) => {
          const property: string = get(user, col.path);
          if (property && property.includes(col.filterPredicate as string)) {
            return false;
          }
          return true;
        });
      });
    }

    // sorting
    const columnToOrderBy = dataSourceModifier.columns.find((tmp) => tmp.sortable && tmp.sortOrder);
    if (columnToOrderBy) {
      if (columnToOrderBy.sortOrder === 'asc') {
        filteredUsers.sort((a, b) =>
          ((get(a, columnToOrderBy.path) as string) || '').localeCompare((get(b, columnToOrderBy.path) as string) || '')
        );
      } else {
        filteredUsers.sort((a, b) =>
          ((get(b, columnToOrderBy.path) as string) || '').localeCompare((get(a, columnToOrderBy.path) as string) || '')
        );
      }
    }

    const start = 0 + dataSourceModifier.pagination.pageSize * (dataSourceModifier.pagination.currentPage - 1);
    const dataSubset = filteredUsers.slice(start, start + dataSourceModifier.pagination.pageSize);
    const resList: IResultList<TenantSpecificDetails<IUser>> = {
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
      size: users.length,
      filteredSize: filteredUsers.length,
      ...resList
    };

    return result;
  }

  private async fetchForPage(clients: Client[]): Promise<TenantSpecificDetails<IUser>[]> {
    let promise = this.cachedPromise;
    if (!promise) {
      promise = this.userDetailsService.searchForUsersMatchingFilterInTennats(clients, '', '');
      this.cachedPromise = promise;
    }
    return promise;
  }
}
