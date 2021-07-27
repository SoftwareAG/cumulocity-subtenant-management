import { Injectable } from '@angular/core';
import { FetchClient, IApplication, IFetchResponse, ITenant, TenantStatus } from '@c8y/client';

@Injectable({
  providedIn: 'root'
})
export class ApplicationSubscriptionService {
  constructor(private fetchClient: FetchClient) {}

  private async performStepForEveryTenant<T>(
    tenants: (ITenant | string)[],
    app: IApplication,
    step: (app: IApplication, tenant: string) => Promise<T>,
    subscribedOnesOnly: boolean,
    unsubscribedOnesOnly: boolean
  ): Promise<T[]> {
    const responseArr = new Array<T>();
    let filteredtenants = tenants.filter((tmp) => typeof tmp === 'string' || tmp.status === TenantStatus.ACTIVE);
    if (unsubscribedOnesOnly) {
      filteredtenants = filteredtenants.filter((tenant) => {
        // @ts-ignore
        const appReferences: { application: IApplication }[] =
          // @ts-ignore
          typeof tenant === 'string' ? [] : tenant.applications.references;
        return !appReferences.some((tmp) => tmp.application.id === app.id);
      });
    }
    if (subscribedOnesOnly) {
      filteredtenants = filteredtenants.filter((tenant) => {
        // @ts-ignore
        const appReferences: { application: IApplication }[] =
          // @ts-ignore
          typeof tenant === 'string' ? [] : tenant.applications.references;
        return appReferences.some((tmp) => tmp.application.id === app.id);
      });
    }
    const promArray = filteredtenants.map((tenant) => step(app, typeof tenant === 'string' ? tenant : tenant.id));
    await Promise.all(promArray).then((result) => {
      responseArr.push(...result);
    });
    return responseArr;
  }

  public async subscribeAppToAppAllTenants(app: IApplication, tenants: ITenant[]): Promise<IFetchResponse[]> {
    const subscribeFunc = (tmpApp: IApplication, tenantId: string) => {
      return this.subscribeApp(tmpApp as any, tenantId);
    };
    return await this.performStepForEveryTenant(tenants, app, subscribeFunc, false, true);
  }

  public async unsubscribeAppsFromAllTenants(app: IApplication, tenants: ITenant[]): Promise<IFetchResponse[]> {
    const unsubscribeFunc = (tmpApp: IApplication, tenantId: string) => {
      return this.unsubscribeApp(tmpApp as any, tenantId);
    };
    return await this.performStepForEveryTenant(tenants, app, unsubscribeFunc, true, false);
  }

  public async subscribeAppToAppAllTenantsById(app: IApplication, tenantIds: string[]): Promise<IFetchResponse[]> {
    const subscribeFunc = (tmpApp: IApplication, tenantId: string) => {
      return this.subscribeApp(tmpApp as any, tenantId);
    };
    return await this.performStepForEveryTenant(tenantIds, app, subscribeFunc, false, true);
  }

  public async unsubscribeAppsFromAllTenantsById(app: IApplication, tenantIds: string[]): Promise<IFetchResponse[]> {
    const unsubscribeFunc = (tmpApp: IApplication, tenantId: string) => {
      return this.unsubscribeApp(tmpApp as any, tenantId);
    };
    return await this.performStepForEveryTenant(tenantIds, app, unsubscribeFunc, false, false);
  }

  private subscribeApp(app: IApplication & { self: string }, tenantId: string) {
    const url = `/tenant/tenants/${tenantId}/applications`;
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.com.nsn.cumulocity.applicationReference+json',
        Accept: 'application/vnd.com.nsn.cumulocity.applicationReference+json'
      },
      body: JSON.stringify({ application: { id: app.id, self: app.self } })
    };
    return this.fetchClient.fetch(url, options);
  }

  private unsubscribeApp(app: IApplication, tenantId: string) {
    const url = `/tenant/tenants/${tenantId}/applications/${app.id}`;
    const options: RequestInit = {
      method: 'DELETE'
    };
    return this.fetchClient.fetch(url, options);
  }
}
