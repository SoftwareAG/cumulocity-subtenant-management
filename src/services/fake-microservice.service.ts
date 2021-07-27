import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import {
  ApplicationService,
  ApplicationType,
  BasicAuth,
  Client,
  FetchClient,
  IApplication,
  ICredentials,
  ITenant
} from '@c8y/client';
import { ModalService, Status } from '@c8y/ngx-components';
import { TenantSelectionComponent } from '@modules/shared/tenant-selection/tenant-selection.component';
import { flatMap, uniq } from 'lodash-es';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { CustomApiService } from './custom-api.service';
import { SubtenantDetailsService } from './subtenant-details.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ApplicationSubscriptionService } from './application-subscription.service';

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
    private bsModalService: BsModalService,
    private applicationSubscription: ApplicationSubscriptionService
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
    const tenantPromise = this.subtenantDetails.getTenants();
    await this.checkDataUsageConfirmed();
    const app = await this.createDummyMicroserviceIfNotExisting();
    const tenants = await tenantPromise;
    const filteredTenants = await this.subsetOfTenantsSelected(tenants);
    await this.applicationSubscription.subscribeAppToAppAllTenants(app, filteredTenants);
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
    await this.applicationSubscription.unsubscribeAppsFromAllTenants(app, tenants);
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
