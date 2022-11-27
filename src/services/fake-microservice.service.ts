import { Inject, Injectable, InjectionToken, OnDestroy, Optional } from '@angular/core';
import {
  ApplicationService,
  ApplicationType,
  BasicAuth,
  Client,
  FetchClient,
  IApplication,
  ICredentials,
  IFetchResponse,
  IMicroserviceSubscriptionsResponse,
  ITenant,
  ITenantLoginOption
} from '@c8y/client';
import { AlertService, AppStateService, LoginService, ModalService, OptionsService, Status } from '@c8y/ngx-components';
import { flatMap, get, omit, uniq } from 'lodash-es';
import { CustomApiService } from './custom-api.service';
import { SubtenantDetailsService } from './subtenant-details.service';
import { ApplicationSubscriptionService } from './application-subscription.service';
import { TenantSelectionService } from '@modules/shared/tenant-selection/tenant-selection.service';
import { BearerAuth } from '@models/BearerAuth';
import { interval, Subscription } from 'rxjs';
import { CustomBasicAuth } from '@models/CustomBasicAuth';

export const HOOK_MICROSERVICE_ROLE = new InjectionToken('MicroserviceRole');

declare const __MODE__: string;

@Injectable()
export class FakeMicroserviceService implements OnDestroy {
  private requiredRoles: string[] = [];

  private credentialsCache: Promise<ICredentials[]>;
  private cachedModal: Promise<unknown>;
  private clientsPromiseCache = new Map<string, Promise<Client>>();
  private clientsAuthCache = new Map<string, BasicAuth | BearerAuth>();
  private clientsCredentialsCache = new Map<string, ICredentials>();

  private oauthTokenExpirySub: Subscription;

  constructor(
    @Optional() @Inject(HOOK_MICROSERVICE_ROLE) factories: (string | string[])[],
    private fetchClient: FetchClient,
    private appService: ApplicationService,
    private modalService: ModalService,
    private customApiService: CustomApiService,
    private subtenantDetails: SubtenantDetailsService,
    private applicationSubscription: ApplicationSubscriptionService,
    private tenantSelectionService: TenantSelectionService,
    private appState: AppStateService,
    private alertService: AlertService,
    private options: OptionsService,
    private loginService: LoginService
  ) {
    if (factories) {
      const roles = flatMap(factories);
      const uniqRoles = uniq(roles);
      this.requiredRoles = uniqRoles;
    }

    this.oauthTokenExpirySub = interval(60000).subscribe(() => {
      this.clientsAuthCache.forEach((auth, key) => {
        if (auth instanceof BearerAuth) {
          if (auth.millisecondsUtilTokenExpires() < 120000) {
            const creds = this.clientsCredentialsCache.get(key);
            this.subtenantDetails
              .getDetailsOfTenant(creds.tenant)
              .then((tenant) => {
                return this.getAccessToken(this.clientsCredentialsCache.get(key), tenant.domain);
              })
              .then(
                (token) => {
                  auth.updateCredentials({ token });
                },
                () => {
                  console.error('failed to refresh token for tenant: ' + key);
                }
              );
          }
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this.oauthTokenExpirySub) {
      this.oauthTokenExpirySub.unsubscribe();
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
    const selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenants, {
      label: 'Select subset of tenants to be accessed',
      title: 'Select tenant subset'
    });

    return tenants.filter((tmp) => selectedTenantIds.includes(tmp.id));
  }

  public async createClients(credentials: ICredentials[], domain?: string): Promise<Client[]> {
    return Promise.all(
      credentials.map((cred) => {
        let promise = this.clientsPromiseCache.get(cred.tenant);
        if (!promise) {
          promise = this.createClient(cred, domain);
          this.clientsPromiseCache.set(cred.tenant, promise);
        }
        return promise;
      })
    );
  }

  private async allowsOAuth(credentials: ICredentials): Promise<boolean> {
    const client = new FetchClient(new CustomBasicAuth(credentials));
    // it seems like this endpoint has some pretty strict rate limiting..
    for (let i = 0; i < 10; i++) {
      const response = await client.fetch(`/tenant/loginOptions?tenantId=${credentials.tenant}`, {
        headers: { 'X-Cumulocity-Application-Key': await this.getMsKey() }
      });
      // in case of to many request: try again..
      if (response.status === 429) {
        continue;
      }
      if (response.status !== 200) {
        throw new Error('');
      }
      const { loginOptions }: { loginOptions: ITenantLoginOption[] } = await response.json();
      if (loginOptions && loginOptions.findIndex((tmp) => tmp.type === 'OAUTH2_INTERNAL') >= 0) {
        return true;
      }
      return false;
    }
    throw new Error('Too many retries');
  }

  private async createClient(credentials: ICredentials, domain?: string): Promise<Client> {
    this.clientsCredentialsCache.set(credentials.tenant, credentials);
    let auth: BasicAuth | BearerAuth;
    if (await this.allowsOAuth(credentials)) {
      const accessToken = await this.getAccessToken(credentials, domain);
      auth = new BearerAuth({ token: accessToken });
    } else {
      auth = new BasicAuth(credentials);
    }
    this.clientsAuthCache.set(credentials.tenant, auth);
    const client = new Client(auth, domain);
    client.core.tenant = credentials.tenant;
    const header = { 'X-Cumulocity-Application-Key': await this.getMsKey() };
    client.core.defaultHeaders = Object.assign(header, client.core.defaultHeaders);
    this.customApiService.hookIntoCustomClientFetch(client);
    return client;
  }

  private async getAccessToken(credentials: ICredentials, domain?: string): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'PASSWORD',
      username: credentials.user,
      password: credentials.password,
      tfa_code: credentials.tfa
    });
    const fetchClient = new FetchClient(new CustomBasicAuth(credentials), domain);
    let response: IFetchResponse;
    for (let i = 0; i < 10; i++) {
      response = await fetchClient.fetch(`/tenant/oauth/token?tenant_id=${credentials.tenant}`, {
        method: 'POST',
        body: params.toString(),
        headers: {
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }
      });
      // in case of to many request: try again..
      if (response.status === 429) {
        continue;
      }

      break;
    }

    if (response.status !== 200) {
      throw new Error('');
    }

    const json: { access_token: string } = await response.json();
    return json.access_token;
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
    if (this.showWarnings()) {
      await this.checkDataUsageConfirmed();
    }
    const app = await this.createDummyMicroserviceIfNotExisting();
    const tenants = await tenantPromise;
    let filteredTenants = tenants;
    if (this.showWarnings()) {
      filteredTenants = await this.subsetOfTenantsSelected(tenants);
    }

    await this.applicationSubscription.subscribeAppToAllTenants(app, filteredTenants);
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
    await this.applicationSubscription.unsubscribeAppFromAllTenants(app, tenants);
    await this.deleteApp(app);
    this.credentialsCache = null;
  }

  public async getMsKey(): Promise<string> {
    const currentTenant = this.appState.currentTenant.value;
    const hashedTenantId = await this.sha256(currentTenant.name);
    return `subtenant-mgmt-${hashedTenantId.substring(0, 8)}`;
  }

  public async getMsName(): Promise<string> {
    const currentTenant = this.appState.currentTenant.value;
    const hashedTenantId = await this.sha256(currentTenant.name);
    return `subtenant-mgmt-${hashedTenantId.substring(0, 8)}`;
  }

  private getMsDescription(): string {
    const currentTenant = this.appState.currentTenant.value;
    return `Microservice that allows tenant ${currentTenant.name} to get access to this tenant.`;
  }

  private async sha256(message: string): Promise<string> {
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(message);

    // hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

    // convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // convert bytes to hex string
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
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
    const loginMode = get(this.loginService, 'loginMode.type', 'BASIC');
    const client: Client = new Client(new BasicAuth(bootstrapCredentials));
    if (loginMode !== 'BASIC') {
      this.alertService.danger(
        `OAuth on the management/enterprise tenant is currently not supported. Please reconfigure your tenant to use this application.`
      );
      throw Error(`OAuth on the management/enterprise tenant is currently not supported.`);
    }
    // unable to set use BearerAuth together with OAuthCookie, as Cookie is always preferred..
    // if (loginMode === 'BASIC') {
    //   client = new Client(new BasicAuth(bootstrapCredentials));
    // } else {
    //   const token = await this.getAccessToken(bootstrapCredentials);
    //   client = new Client(new BearerAuth({ token }));
    // }

    const microserviceSubscriptionsEndpoint = '/application/currentApplication/subscriptions';
    const res = await client.core.fetch(microserviceSubscriptionsEndpoint);
    if (res.status !== 200) {
      throw Error(`Unable to retrieve subscriptions: Wrong Statuscode (${res.status})`);
    }
    const { users }: IMicroserviceSubscriptionsResponse = await res.json();
    return users.map(({ tenant, name, password }) => {
      return {
        tenant,
        user: name,
        password
      } as ICredentials;
    });
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
    const ms = await this.getDummyMicroserviceObjForCreation();
    const { data: appList } = await this.appService.listByName(ms.name);
    if (appList && appList.length) {
      return appList[0];
    }
    return null;
  }

  private async getDummyMicroserviceObjForCreation(): Promise<Partial<IApplication>> {
    const msKey = await this.getMsKey();
    const msName = await this.getMsName();
    return {
      name: msName,
      key: msKey,
      type: ApplicationType.MICROSERVICE,
      description: this.getMsDescription(),
      requiredRoles: this.requiredRoles
    };
  }

  private async createDummyMicroservice() {
    const ms = await this.getDummyMicroserviceObjForCreation();
    return this.appService.create(ms);
  }

  private async updateDummyMicroserviceRoles(appId: string | number) {
    const msWithoutType = omit(await this.getDummyMicroserviceObjForCreation(), ['type']);
    return this.appService.update({
      id: appId,
      ...msWithoutType
    });
  }

  private deleteApp(app: IApplication) {
    return this.appService.delete(app.id);
  }

  public async getClientForTenant(tenantId: string): Promise<Client> {
    const creds = await this.prepareCachedDummyMicroserviceForAllSubtenants();
    const tenantCred = creds.find((tmp) => tmp.tenant === tenantId);
    const tenant = await this.subtenantDetails.getDetailsOfTenant(tenantId);
    const [client] = await this.createClients([tenantCred], tenant.domain);
    if (!client) {
      throw Error(`No Client available for tenant: ${tenantId}`);
    }
    return client;
  }

  private showWarnings(): boolean {
    if (this.options.hideWarnings === 'always') {
      return false;
    }
    if (this.options.hideWarnings === 'duringDevelopment' && __MODE__ !== 'production') {
      return false;
    }
    return true;
  }
}
