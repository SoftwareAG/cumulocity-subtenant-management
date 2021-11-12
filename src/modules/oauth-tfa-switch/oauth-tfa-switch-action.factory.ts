import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Client } from '@c8y/client';
import { Action, ActionFactory, AlertService } from '@c8y/ngx-components';
import { TenantSelectionService } from '@modules/shared/tenant-selection/tenant-selection.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Injectable()
export class OAuthTFASwitchActionFactory implements ActionFactory {
  private action: Action;

  constructor(
    private credService: FakeMicroserviceService,
    private alertService: AlertService,
    private tenantSelectionService: TenantSelectionService
  ) {
    this.action = {
      label: 'Activate OAuth & TFA',
      action: () => {
        this.setupOAuthAndTFAOnTenants();
      },
      icon: 'c8y-shield'
    };
  }

  get(activatedRoute?: ActivatedRoute): Action | Action[] {
    return this.action;
  }

  async setupOAuthAndTFAOnTenants(): Promise<void> {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const tenantIds = credentials.map((tmp) => tmp.tenant);
    let selectedTenantIds: string[] = [];
    try {
      selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenantIds);
    } catch (e) {
      return;
    }
    const filteredCredentials = credentials.filter((tmp) => selectedTenantIds.includes(tmp.tenant));
    const clients = this.credService.createClients(filteredCredentials);
    let countFailures = 0;
    for (const client of clients) {
      try {
        await this.setupTFA(client);
      } catch (e) {
        console.error(e);
        this.alertService.warning(`Failed to setup TFA on tenant: ${client.core.tenant}`, JSON.stringify(e));
        countFailures++;
      }
    }
    if (countFailures) {
      this.alertService.warning(
        `TFA Setup failed on ${countFailures} tenants. ${clients.length - countFailures} were updated successfully.`
      );
    }
    this.alertService.success('Setup TFA on all selected Tenants.');
  }

  async setupTFA(client: Client): Promise<void> {
    await this.enableOAuth(client);
    await this.setupTFAStrategy(client);
  }

  async enableTFA(client: Client): Promise<void> {
    let tfaAlreadyEnabled = false;
    try {
      const response = await client.options.tenant.detail({ category: 'two-factor-authentication', key: 'enabled' });
      tfaAlreadyEnabled = response.data.value === 'true';
    } catch (e) {
      // nothing to do
    }
    if (!tfaAlreadyEnabled) {
      await client.options.tenant.update({ category: 'two-factor-authentication', key: 'enabled', value: 'true' });
    }
    await this.setupTFAStrategy(client);
  }

  async setupTFAStrategy(client: Client): Promise<void> {
    const response = await client.core.fetch(`/tenant/tenants/${client.core.tenant}/tfa`);
    if (response.status !== 200) {
      throw Error('');
    }
    const responseBody = await response.json();
    if (responseBody.strategy === 'TOTP') {
      return;
    }

    const body = { strategy: 'TOTP' };
    const options: RequestInit = {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const updateResponse = await client.core.fetch(`/tenant/tenants/${client.core.tenant}/tfa`, options);
    if (updateResponse.status !== 202) {
      throw Error(`Failed to update TFA Strategy for tenant: ${client.core.tenant}`);
    }
  }

  async enableOAuth(client: Client): Promise<void> {
    const loginOptions = await client.options.login.detail();
    const oauthOption = loginOptions.data.loginOptions.find((option) => option.type === 'OAUTH2_INTERNAL');
    if (!oauthOption) {
      if (loginOptions.data.loginOptions.length !== 1 || loginOptions.data.loginOptions[0].type !== 'BASIC') {
        throw Error(`Tenant ${client.core.tenant} has an unsupported setup..`);
      }
      const body = {
        userManagementSource: 'INTERNAL',
        grantType: 'PASSWORD',
        providerName: 'Cumulocity',
        visibleOnLoginPage: true,
        type: 'OAUTH2_INTERNAL'
      };
      const options: RequestInit = {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json'
        }
      };
      const response = await client.core.fetch(`/tenant/loginOptions?tenantId=${client.core.tenant}`, options);
      if (response.status !== 200) {
        throw Error(`Failed to enable OAuth for tenant: ${client.core.tenant}`);
      }
    }
  }
}
