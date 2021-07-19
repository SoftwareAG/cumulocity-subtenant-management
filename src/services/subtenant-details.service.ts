import { Injectable } from '@angular/core';
import { ITenant, TenantService } from '@c8y/client';

@Injectable()
export class SubtenantDetailsService {
  private cachedTenants: Promise<ITenant[]>;
  constructor(private tenantService: TenantService) {}

  public async getTenants(): Promise<ITenant[]> {
    const tenantArr = new Array<ITenant>();
    const filter = {
      pageSize: 100,
      withApps: false
    };
    let data = await this.tenantService.list(filter);
    while (data.data.length) {
      tenantArr.push(...data.data);
      if (data.data.length < filter.pageSize) {
        break;
      }
      data = await data.paging.next();
    }
    return tenantArr;
  }

  public async getCachedTenants(): Promise<ITenant[]> {
    if (!this.cachedTenants) {
      this.cachedTenants = this.getTenants();
    }
    return this.cachedTenants;
  }

  public async getDetailsOfTenant(tenantId: string): Promise<ITenant> {
    const tenants = await this.getCachedTenants();
    return tenants.find((tmp) => tmp.id === tenantId);
  }
}
