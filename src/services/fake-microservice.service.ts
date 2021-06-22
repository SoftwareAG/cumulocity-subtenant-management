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
  TenantStatus
} from '@c8y/client';
import { ModalService, Status } from '@c8y/ngx-components';
import { TenantSelectionComponent } from '@modules/shared/tenant-selection/tenant-selection.component';
import { flatMap, uniq } from 'lodash-es';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { CustomApiService } from './custom-api.service';
import { SubtenantDetailsService } from './subtenant-details.service';
import { BsModalService } from 'ngx-bootstrap/modal';

export const HOOK_MICROSERVICE_ROLE = new InjectionToken('MicroserviceRole');

@Injectable()
export class FakeMicroserviceService {
  public static appkey = 'subtenant-management-ms-key';
  public static appName = 'subtenant-management-ms';
  private requiredRoles: string[] = [];

  private credentialsCache: Promise<ICredentials[]>;
  private cachedModal: Promise<unknown>;

  constructor(
    @Optional() @Inject(HOOK_MICROSERVICE_ROLE) factories: (string | string[])[],
    private fetchClient: FetchClient,
    private appService: ApplicationService,
    private modalService: ModalService,
    private customApiService: CustomApiService,
    private subtenantDetails: SubtenantDetailsService,
    private bsModalService: BsModalService
  ) {
    if (factories) {
      const roles = flatMap(factories);
      const uniqRoles = uniq(roles);
      this.requiredRoles = uniqRoles;
    }
  }

  private async checkDataUsageConfirmed() {
    if (!this.cachedModal) {
      this.cachedModal = this.modalService.confirm(
        'Accessing data of subtenants/customers',
        'This is a very powerful tool, that allows you to look into subtenants of your current tenant and to perform actions that could potentially break things. Also for data protection reasons make sure that your subtenants are aware of the fact that you are able to access their devices and data.\r\n\r\n"With great power there must also come great responsibility."',
        Status.DANGER,
        {
          ok: 'I accept the potential risks & made subtenants aware',
          cancel: 'Cancel'
        }
      );
    }
    try {
      await this.cachedModal;
    } catch (e) {
      this.cachedModal = null;
      throw e;
    }
  }

  private async subsetOfTenantsSelected(tenants: ITenant[]) {
    const tenantIds = tenants.map((tmp) => ({ name: tmp.id }));
    const response = new Subject<{ name: string }[]>();
    const promise = response.asObservable().pipe(take(1)).toPromise();

    this.bsModalService.show(TenantSelectionComponent, {
      initialState: {
        response,
        tenants: tenantIds,
        label: 'Select subset of tenants to be accessed',
        title: 'Select tenant subset'
      } as Partial<TenantSelectionComponent>,
      ignoreBackdropClick: true
    });
    return promise.then((result) => {
      if (result) {
        const filteredTenantsIds = result.map((tmp) => tmp.name);
        return tenants.filter((tmp) => filteredTenantsIds.includes(tmp.id));
      } else {
        throw 'Tenant selection canceled';
      }
    });
  }

  public createClients(credentials: ICredentials[]): Client[] {
    return credentials.map((cred) => {
      const client = new Client(new BasicAuth(cred));
      client.core.tenant = cred.tenant;
      const header = { 'X-Cumulocity-Application-Key': FakeMicroserviceService.appkey };
      client.core.defaultHeaders = Object.assign(header, client.core.defaultHeaders);
      this.customApiService.hookIntoCustomClientFetch(client);
      return client;
    });
  }

  public async prepareCachedDummyMicroserviceForAllSubtenants(baseUrl?: string): Promise<ICredentials[]> {
    if (!this.credentialsCache) {
      this.credentialsCache = this.prepareDummyMicroserviceForAllSubtenants(baseUrl);
    }
    try {
      return await this.credentialsCache;
    } catch (e) {
      this.credentialsCache = null;
      throw e;
    }
  }

  public async prepareDummyMicroserviceForAllSubtenants(baseUrl?: string): Promise<ICredentials[]> {
    await this.checkDataUsageConfirmed();
    const app = await this.createDummyMicroserviceIfNotExisting();
    const tenants = await this.subtenantDetails.getTenants();
    const filteredTenants = await this.subsetOfTenantsSelected(tenants);
    await this.subscribeAppToAppAllTenants(app, filteredTenants);
    const bootstrapCredentials = await this.getBootstrapUser(app);
    const subscriptions = await this.getMicroserviceSubscriptions(bootstrapCredentials, baseUrl);
    const filteredTenantIds = filteredTenants.map((tmp) => tmp.id);
    const filteredSubscriptions = subscriptions.filter((tmp) => filteredTenantIds.includes(tmp.tenant));
    return filteredSubscriptions;
  }

  public async cleanup(): Promise<void> {
    const app = await this.findDummyMicroservice();
    if (!app) {
      return;
    }
    const tenants = await this.subtenantDetails.getTenants();
    await this.unsubscribeAppsFromAllTenants(app, tenants);
    await this.deleteApp(app);
    this.credentialsCache = null;
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
    tenants: ITenant[],
    app: IApplication,
    step: (app: IApplication, tenant: ITenant) => Promise<T>,
    subscribedOnesOnly: boolean,
    unsubscribedOnesOnly: boolean
  ): Promise<T[]> {
    const responseArr = new Array<T>();
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
    return responseArr;
  }

  private async subscribeAppToAppAllTenants(app: IApplication, tenants: ITenant[]) {
    const subscribeFunc = (tmpApp: IApplication, tenant: ITenant) => {
      return this.subscribeApp(tmpApp as any, tenant);
    };
    await this.performStepForEveryTenant(tenants, app, subscribeFunc, false, true);
  }

  private async unsubscribeAppsFromAllTenants(app: IApplication, tenants: ITenant[]) {
    const unsubscribeFunc = (tmpApp: IApplication, tenant: ITenant) => {
      return this.unsubscribeApp(tmpApp as any, tenant);
    };
    await this.performStepForEveryTenant(tenants, app, unsubscribeFunc, true, false);
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
