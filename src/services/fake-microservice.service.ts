import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import {
  ApplicationService,
  ApplicationType,
  BasicAuth,
  Client,
  FetchClient,
  IApplication,
  ICredentials,
  ITenant,
  Paging,
  TenantService,
  TenantStatus
} from '@c8y/client';
import { flatMap, uniq } from 'lodash-es';

export const HOOK_MICROSERVICE_ROLE = new InjectionToken('MicroserviceRole');

@Injectable()
export class FakeMicroserviceService {
  public static appkey = 'subtenant-management-ms-key';
  public static appName = 'subtenant-management-ms';
  private requiredRoles: string[] = [];

  private credentialsCache: Promise<ICredentials[]>;

  constructor(
    @Optional() @Inject(HOOK_MICROSERVICE_ROLE) factories: (string | string[])[],
    private fetchClient: FetchClient,
    private tenantService: TenantService,
    private appService: ApplicationService
  ) {
    if (factories) {
      const roles = flatMap(factories);
      const uniqRoles = uniq(roles);
      this.requiredRoles = uniqRoles;
    }
  }

  public createClients(credentials: ICredentials[]): Client[] {
    return credentials.map((cred) => {
      const client = new Client(new BasicAuth(cred));
      client.core.tenant = cred.tenant;
      const header = { 'X-Cumulocity-Application-Key': FakeMicroserviceService.appkey };
      client.core.defaultHeaders = Object.assign(header, client.core.defaultHeaders);
      return client;
    });
  }

  public prepareCachedDummyMicroserviceForAllSubtenants(baseUrl?: string): Promise<ICredentials[]> {
    if (!this.credentialsCache) {
      this.credentialsCache = this.prepareDummyMicroserviceForAllSubtenants(baseUrl);
    }
    return this.credentialsCache;
  }

  public async prepareDummyMicroserviceForAllSubtenants(baseUrl?: string): Promise<ICredentials[]> {
    const app = await this.createDummyMicroserviceIfNotExisting();
    await this.subscribeAppToAppAllTenants(app);
    const bootstrapCredentials = await this.getBootstrapUser(app);
    const subscriptions = await this.getMicroserviceSubscriptions(bootstrapCredentials, baseUrl);
    return subscriptions;
  }

  public async cleanup(): Promise<void> {
    const app = await this.findDummyMicroservice();
    if (!app) {
      return;
    }
    await this.unsubscribeAppsFromAllTenants(app);
    await this.deleteApp(app);
  }

  private async getBootstrapUser(app: IApplication) {
    const bootstrapCredentialsEndpoint = `/application/applications/${app.id}/bootstrapUser`;
    const res = await this.fetchClient.fetch(bootstrapCredentialsEndpoint);
    const { tenant, name, password } = await res.json();
    return { tenant, password, user: name } as ICredentials;
  }

  private async getMicroserviceSubscriptions(
    bootstrapCredentials: ICredentials,
    baseUrl?: string
  ): Promise<ICredentials[]> {
    return Client.getMicroserviceSubscriptions(bootstrapCredentials, baseUrl);
  }

  private async performStepForEveryTenant<T>(
    app: IApplication,
    step: (app: IApplication, tenant: ITenant) => Promise<T>,
    subscribedOnesOnly: boolean,
    unsubscribedOnesOnly: boolean
  ): Promise<T[]> {
    const responseArr = new Array<T>();
    const filter = { pageSize: 100, withApps: false };
    let tenants: ITenant[] = [];
    let paging: Paging<ITenant>;
    let res = await this.tenantService.list(filter);

    while (res.data.length > 0) {
      tenants = res.data;
      paging = res.paging;
      let filteredtenants = tenants.filter((tmp) => tmp.status === TenantStatus.ACTIVE);
      if (unsubscribedOnesOnly) {
        filteredtenants = filteredtenants.filter((tenant) => {
          // @ts-ignore
          const appReferences: { application: IApplication }[] = tenant.applications.references;
          return !appReferences.some((tmp) => tmp.application.id === app.id);
        });
      }
      if (subscribedOnesOnly) {
        filteredtenants = filteredtenants.filter((tenant) => {
          // @ts-ignore
          const appReferences: { application: IApplication }[] = tenant.applications.references;
          return appReferences.some((tmp) => tmp.application.id === app.id);
        });
      }
      const promArray = filteredtenants.map((tenant) => step(app, tenant));
      await Promise.all(promArray).then((result) => {
        responseArr.push(...result);
      });
      tenants = [];
      if (res.data.length < filter.pageSize) {
        break;
      }
      res = await paging.next(filter);
    }
    return responseArr;
  }

  private async subscribeAppToAppAllTenants(app: IApplication) {
    const subscribeFunc = (tmpApp: IApplication, tenant: ITenant) => {
      return this.subscribeApp(tmpApp as any, tenant);
    };
    await this.performStepForEveryTenant(app, subscribeFunc, false, true);

    // const tenantsWithoutApp = tenants.filter(tmp => tmp.status === TenantStatus.ACTIVE)
    // // .filter(tenant => tenant.id === 't10452223')
    // .filter(tenant => {
    //     // @ts-ignore
    //     const appReferences: {application: IApplication}[] = tenant.applications.references;
    //     return !appReferences.some(tmp => tmp.application.id === app.id);
    // });
    // console.log('Subscribing apps to: ', tenantsWithoutApp.map(tmp => tmp.id));
    // const promArray = tenantsWithoutApp.map(tenant => this.subscribeApp(app as any, tenant));
    // await Promise.all(promArray).then(result => {
    //     console.log('Subscribed to: ', result.length, ' Tenants');
    // });
  }

  private async unsubscribeAppsFromAllTenants(app: IApplication) {
    const unsubscribeFunc = (tmpApp: IApplication, tenant: ITenant) => {
      return this.unsubscribeApp(tmpApp as any, tenant);
    };
    await this.performStepForEveryTenant(app, unsubscribeFunc, true, false);
    // const {data: tenants} = await this.client.tenant.list({pageSize: 1000});
    // const tenantsWithApp = tenants
    // // .filter(tenant => tenant.id === 't10452223')
    // .filter(tenant => {
    //     // @ts-ignore
    //     const appReferences: {application: IApplication}[] = tenant.applications.references;
    //     return appReferences.some(tmp => tmp.application.id === app.id);
    // });
    // console.log('Unsubscribing app from: ', tenantsWithApp.map(tmp => tmp.id));
    // const promArray = tenantsWithApp.map(tenant => this.unsubscribeApp(app as any, tenant));
    // await Promise.all(promArray).then(result => {
    //     console.log('Unsubscribed from: ', result.length, ' Tenants');
    // });
  }

  private subscribeApp(app: IApplication & { self: string }, tenant: ITenant) {
    const url = `/tenant/tenants/${tenant.id}/applications`;
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

  private unsubscribeApp(app: IApplication, tenant: ITenant) {
    const url = `/tenant/tenants/${tenant.id}/applications/${app.id}`;
    const options: RequestInit = {
      method: 'DELETE'
    };
    return this.fetchClient.fetch(url, options);
  }

  private async createDummyMicroserviceIfNotExisting() {
    let app = await this.findDummyMicroservice();
    if (!app) {
      const { data: createdApp } = await this.createDummyMicroservice();
      app = createdApp;
    } else {
      const someRoleMissing = this.requiredRoles.some((role) => !app.requiredRoles.includes(role));
      if (someRoleMissing) {
        const { data: updatedApp } = await this.updateDummyMicroserviceRoles(app.id);
        app = updatedApp;
      }
    }
    return app;
  }

  private async findDummyMicroservice() {
    const { data: appList } = await this.appService.listByName(FakeMicroserviceService.appName);
    if (appList && appList.length) {
      return appList[0];
    }
    return null;
  }

  private createDummyMicroservice() {
    return this.appService.create({
      name: FakeMicroserviceService.appName,
      key: FakeMicroserviceService.appkey,
      type: ApplicationType.MICROSERVICE,
      requiredRoles: this.requiredRoles
    });
  }

  private updateDummyMicroserviceRoles(appId: string | number) {
    return this.appService.update({
      id: appId,
      name: FakeMicroserviceService.appName,
      key: FakeMicroserviceService.appkey,
      // type is not updateable
      // type: ApplicationType.MICROSERVICE,
      requiredRoles: this.requiredRoles
    });
  }

  private deleteApp(app: IApplication) {
    return this.appService.delete(app.id);
  }
}
