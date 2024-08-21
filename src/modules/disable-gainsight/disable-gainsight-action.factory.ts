import { Injectable } from '@angular/core';
import { Client, ITenant, TenantService } from '@c8y/client';
import { ActionFactory, Action, AlertService } from '@c8y/ngx-components';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { TenantSelectionService } from '@modules/shared/tenant-selection/tenant-selection.service';

@Injectable()
export class DisableGainsightActionFactory implements ActionFactory {
  action: Action;
  constructor(
    private credService: FakeMicroserviceService,
    private alertService: AlertService,
    private tenantSelectionService: TenantSelectionService,
    private tenantService: TenantService
  ) {
    this.action = {
      label: 'Disable Gainsight',
      action: () => {
        this.disableGainsight();
      },
      priority: 1,
      icon: 'ban'
    };
  }

  get(): Action {
    return this.action;
  }

  async disableGainsight(): Promise<void> {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const tenantIds = credentials.map((tmp) => tmp.tenant) as string[];
    let selectedTenantIds: string[] = [];
    try {
      selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenantIds);
    } catch (e) {
      return;
    }
    const filteredCredentials = credentials.filter((tmp) => selectedTenantIds.includes(tmp.tenant as string));
    const clients = await this.credService.createClients(filteredCredentials);
    const promArray = clients.map((tmp) => this.disableGainsightIfNotAlreadyDone(tmp));
    Promise.all(promArray).then(
      (disabledTenants) => {
        const tenantsWhichAlreadyWereDisabled = disabledTenants.filter((tmp) => !!tmp).length;
        this.alertService.success(
          `Disabled Gainsight on all selected Tenants.`,
          `${tenantsWhichAlreadyWereDisabled ? `${tenantsWhichAlreadyWereDisabled} had already been disabled.` : ''}`
        );
      },
      (error) => {
        this.alertService.warning('Failed to disable Gainsight on all selected Tenants.', JSON.stringify(error));
      }
    );
  }

  async disableGainsightIfNotAlreadyDone(client: Client): Promise<boolean> {
    const { data: currentTenant } = await client.tenant.current();
    const customProperties = currentTenant.customProperties || {};
    if (customProperties['gainsightEnabled'] === false) {
      // already disabled
      return true;
    }
    Object.assign(customProperties, { gainsightEnabled: false });
    await this.tenantService.update({ customProperties, id: currentTenant.name } as ITenant & any);
    return false;
  }
}
