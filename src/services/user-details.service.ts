import { Injectable } from '@angular/core';
import { Client, IUser } from '@c8y/client';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { flatMap } from 'lodash-es';

@Injectable({
  providedIn: 'root'
})
export class UserDetailsService {
  constructor() {}

  public async searchForUsersMatchingFilterInTennats(clients: Client[], usernameFilter: string, emailFilter: string) {
    const usernameRegExp = this.createRegExp(usernameFilter);
    const emailRegExp = this.createRegExp(emailFilter);
    console.log(clients);
    const matches = await Promise.all(
      clients.map((client) => this.searchForUsersMatchingFilterInTennat(client, usernameRegExp, emailRegExp))
    );
    return flatMap(matches);
  }

  public async searchForUsersMatchingFilterInTennat(client: Client, usernameFilter: RegExp, emailFilter: RegExp) {
    const usersMatchingFilter = new Array<TenantSpecificDetails<IUser>>();
    const filter = {
      withApps: false,
      withGroups: false,
      withRoles: false,
      withSubusersCount: false,
      pageSize: 100
    };
    let response = await client.user.list(filter);
    while (response.data.length > 0) {
      let users = response.data;
      if (emailFilter) {
        users = users.filter((user) => user.email && emailFilter.test(user.email));
      }
      if (usernameFilter) {
        users = users.filter((user) => user.userName && usernameFilter.test(user.userName));
      }
      const usersWithTenant = users.map((tmp) => {
        return {
          data: tmp,
          tenantId: client.core.tenant
        } as TenantSpecificDetails<IUser>;
      });
      usersMatchingFilter.push(...usersWithTenant);
      if (response.data.length < filter.pageSize) {
        break;
      }
      response = await response.paging.next(filter);
    }
    return usersMatchingFilter;
  }

  private createRegExp(filter: string) {
    return filter ? new RegExp(`.*${filter}.*`, 'i') : null;
  }
}
