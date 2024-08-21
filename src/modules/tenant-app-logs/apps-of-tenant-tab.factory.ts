import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Tab, TabFactory } from '@c8y/ngx-components';
import { IApplicationManagedObject } from '@models/application-mo';
import { merge, NEVER, Observable } from 'rxjs';
import { filter, map, take, timeout } from 'rxjs/operators';
import { AppsOfTenantService } from './apps-of-tenant.service';

@Injectable()
export class AppsOfTenantTabFactory implements TabFactory {
  constructor(private appsOfTenant: AppsOfTenantService) {}

  async get(activatedRoute?: ActivatedRoute): Promise<Tab[]> {
    const observables = new Array<Observable<string>>();
    const contextData$ = activatedRoute?.data.pipe(
      filter((tmp) => tmp['contextData']),
      take(1),
      map((tmp) => tmp['contextData'].id as string)
    ) || NEVER;
    observables.push(contextData$);
    if (activatedRoute?.parent) {
      const parent$ = activatedRoute.parent.params.pipe(
        filter((tmp) => tmp['id']),
        take(1),
        map((tmp) => tmp['id'])
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
    const apps = await this.appsOfTenant.getCachedAppsSupportingLogs(tenantId);
    const tabs = this.mapAppsToTabs(apps, tenantId);
    return tabs;
  }

  private mapAppsToTabs(apps: IApplicationManagedObject[], tenantId: string): Tab[] {
    const tabs = new Array<Tab>();
    apps.forEach((app) => {
      if (app.c8y_Status && app.c8y_Status.instances) {
        Object.keys(app.c8y_Status.instances).forEach((instance, index) => {
          tabs.push({
            label: `Logs: ${app.name || 'unknown'} #${index + 1}`,
            path: `tenants/${tenantId}/app-log/${app.applicationId}/${instance}`,
            icon: 'file-text'
          } as Tab);
        });
      }
    });
    return tabs;
  }
}
