import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IApplication } from '@c8y/client';
import { Tab, TabFactory } from '@c8y/ngx-components';
import { merge, Observable } from 'rxjs';
import { filter, map, take, timeout } from 'rxjs/operators';
import { AppsOfTenantService } from './apps-of-tenant.service';

@Injectable()
export class AppsOfTenantTabFactory implements TabFactory {
  constructor(private appsOfTenant: AppsOfTenantService) {}

  async get(activatedRoute?: ActivatedRoute): Promise<Tab[]> {
    const observables = new Array<Observable<string>>();
    const contextData$ = activatedRoute.data.pipe(
      filter((tmp) => tmp.contextData),
      take(1),
      map((tmp) => tmp.contextData.id as string)
    );
    observables.push(contextData$);
    if (activatedRoute.parent) {
      const parent$ = activatedRoute.parent.params.pipe(
        filter((tmp) => tmp.id),
        take(1),
        map((tmp) => tmp.id)
      );
      observables.push(parent$);
    }
    const tenantId = await merge(...observables)
      .pipe(timeout(10000), take(1))
      .toPromise()
      .catch(() => '');
    if (!tenantId) {
      return [];
    }
    const apps = await this.appsOfTenant.getCachedAppsOfTenant(tenantId);
    const tabs = this.mapAppsToTabs(apps, tenantId);
    return tabs;
  }

  private mapAppsToTabs(apps: IApplication[], tenantId?: string): Tab[] {
    return apps
      .filter(
        (app: IApplication & { manifest: { isolation: string } }) =>
          app.type === 'MICROSERVICE' && (app.owner.tenant.id === tenantId || app.manifest.isolation === 'PER_TENANT')
      )
      .map((app) => {
        return {
          label: `Logs: ${app.name || app.contextPath || 'unknown'}`,
          path: `tenants/${tenantId}/app-log/${app.id}`,
          icon: 'file-text'
        } as Tab;
      });
  }
}
