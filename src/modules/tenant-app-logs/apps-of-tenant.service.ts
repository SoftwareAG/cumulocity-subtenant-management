import { Injectable } from '@angular/core';
import { IApplication } from '@c8y/ngx-components/node_modules/@c8y/client';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Injectable({
  providedIn: 'root'
})
export class AppsOfTenantService {
  private promiseMap = new Map<string, Promise<IApplication[]>>();
  constructor(private credService: FakeMicroserviceService) {}

  async getCachedAppsOfTenant(tenantId: string): Promise<IApplication[]> {
    let cachedResponse = this.promiseMap.get(tenantId);
    if (!cachedResponse) {
      this.promiseMap.clear();
      cachedResponse = this.getAllAppsOfTenant(tenantId);
      this.promiseMap.set(tenantId, cachedResponse);
    }
    const apps = await cachedResponse;
    return apps;
  }

  private async getAllAppsOfTenant(tenantId: string): Promise<IApplication[]> {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = await this.credService.createClients(credentials);
    const client = clients.find((tmp) => tmp.core.tenant === tenantId);

    if (!client) {
      throw Error(`No client for tenant: ${tenantId} available.`);
    }
    const apps = new Array<IApplication>();
    let response = await client.application.list({ pageSize: 100 });
    while (response.data.length) {
      apps.push(...response.data);
      if (response.data.length < response.paging.pageSize) {
        break;
      }
      response = await response.paging.next();
    }
    return apps;
  }
}
