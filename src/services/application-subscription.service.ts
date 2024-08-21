import { Injectable } from '@angular/core';
import { FetchClient, IApplication, IFetchResponse, IIdentified, ITenant, TenantStatus } from '@c8y/client';

@Injectable({
  providedIn: 'root'
})
export class ApplicationSubscriptionService {
  constructor(private fetchClient: FetchClient) {}

  private async performStepForEveryTenant<T>(
    tenants: ITenant[],
    app: IApplication,
    step: (app: IApplication, tenant: string) => Promise<T>,
    subscribedOnesOnly: boolean,
    unsubscribedOnesOnly: boolean
  ): Promise<T[]> {
    const responseArr = new Array<T>();
    let filteredtenants = tenants.filter((tmp) => typeof tmp === 'string' || tmp.status === TenantStatus.ACTIVE);
    if (unsubscribedOnesOnly) {
      filteredtenants = filteredtenants.filter((tenant) =>
        typeof tenant === 'string' ? true : !this.hasApp(tenant, app)
      );
    }
    if (subscribedOnesOnly) {
      filteredtenants = filteredtenants.filter((tenant) =>
        typeof tenant === 'string' ? true : this.hasApp(tenant, app)
      );
    }
    const promArray = filteredtenants.map((tenant) => step(app, typeof tenant === 'string' ? tenant : tenant.id));
    await Promise.all(promArray).then((result) => {
      responseArr.push(...result);
    });
    return responseArr;
  }

  public async subscribeAppToAllTenants(app: IApplication, tenants: ITenant[]): Promise<IFetchResponse[]> {
    const subscribeFunc = (tmpApp: IApplication, tenantId: string) => {
      return this.subscribeApp(tmpApp as any, tenantId);
    };
    return await this.performStepForEveryTenant(tenants, app, subscribeFunc, false, true);
  }

  public async unsubscribeAppFromAllTenants(app: IApplication, tenants: ITenant[]): Promise<IFetchResponse[]> {
    const unsubscribeFunc = (tmpApp: IApplication, tenantId: string) => {
      return this.unsubscribeApp(tmpApp as any, tenantId);
    };
    return await this.performStepForEveryTenant(tenants, app, unsubscribeFunc, true, false);
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

  hasApp(tenant: ITenant, app: IApplication | IIdentified): boolean {
    // @ts-ignore
    const appReferences: { application: IApplication | IIdentified }[] = tenant.applications.references;
    return appReferences.some((tmp) => tmp.application.id === app.id);
  }
}
