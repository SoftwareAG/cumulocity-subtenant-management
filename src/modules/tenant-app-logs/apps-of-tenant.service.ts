import { Injectable } from '@angular/core';
import { IApplicationManagedObject } from '@models/application-mo';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Injectable({
  providedIn: 'root'
})
export class AppsOfTenantService {
  private promiseMapAppStatus = new Map<string, Promise<IApplicationManagedObject[]>>();
  constructor(private credService: FakeMicroserviceService) {}

  async getCachedAppsSupportingLogs(tenantId: string): Promise<IApplicationManagedObject[]> {
    let cachedResponse = this.promiseMapAppStatus.get(tenantId);
    if (!cachedResponse) {
      this.promiseMapAppStatus.clear();
      cachedResponse = this.getAppsSupportingLogs(tenantId);
      this.promiseMapAppStatus.set(tenantId, cachedResponse);
    }
    const apps = await cachedResponse;
    return apps;
  }

  private async getAppsSupportingLogs(tenantId: string): Promise<IApplicationManagedObject[]> {
    const client = await this.credService.getClientForTenant(tenantId);
    const apps = new Array<IApplicationManagedObject>();
    let response = await client.inventory.list({
      pageSize: 2000,
      query: `type eq 'c8y_Application_*' and has(c8y_SupportedLogs)`
    });
    while (response.data.length) {
      apps.push(...(response.data as IApplicationManagedObject[]));
      if (response.data.length < response.paging.pageSize) {
        break;
      }
      response = await response.paging.next();
    }
    const filteredApps = apps.filter(
      (app) => app.c8y_SupportedLogs && Array.isArray(app.c8y_SupportedLogs) && app.c8y_SupportedLogs.includes('syslog')
    );
    return filteredApps;
  }
}
