import { Injectable } from '@angular/core';
import { Client } from '@c8y/client';
import { ActionFactory, Action, AlertService } from '@c8y/ngx-components';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { TenantSelectionService } from '@modules/shared/tenant-selection/tenant-selection.service';

@Injectable()
export class RestartApamaActionFactory implements ActionFactory {
  action: Action;
  constructor(
    private credService: FakeMicroserviceService,
    private alertService: AlertService,
    private tenantSelectionService: TenantSelectionService
  ) {
    this.action = {
      label: 'Restart Apama',
      action: () => {
        this.restartApamaOnTenants();
      },
      priority: 2,
      icon: 'refresh'
    };
  }

  get(): Action {
    return this.action;
  }

  async restartApamaOnTenants(): Promise<void> {
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
    const promArray = clients.map((tmp) => this.restartApama(tmp));
    Promise.all(promArray).then(
      () => {
        this.alertService.success('Apama Restarted on all selected Tenants');
      },
      (error) => {
        this.alertService.warning('Failed to restart Apama on all selected Tenants.', JSON.stringify(error));
      }
    );
  }

  restartApama(client: Client): Promise<void> {
    const options: RequestInit = {
      method: 'PUT'
    };
    return client.core.fetch('/service/cep/restart', options).then((result: Response) => {
      if (!result.ok && result.status !== 404 && result.status !== 500) {
        return Promise.reject(result.status);
      }
    });
  }
}
