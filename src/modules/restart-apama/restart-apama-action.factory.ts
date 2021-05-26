import { Injectable } from '@angular/core';
import { Client, ICredentials } from '@c8y/client';
import { ActionFactory, Action, AlertService } from '@c8y/ngx-components';
import { TenantSelectionComponent } from '@modules/shared/tenant-selection/tenant-selection.component';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { BsModalService } from 'ngx-bootstrap/modal';

@Injectable()
export class RestartApamaActionFactory implements ActionFactory {
  action: Action;
  constructor(
    private credService: FakeMicroserviceService,
    private alertService: AlertService,
    private modalService: BsModalService
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
    const tenants = await this.getTenantSelection(credentials);
    const tenantIds = tenants.map((tmp) => tmp.name);
    const filteredCredentials = credentials.filter((tmp) => tenantIds.includes(tmp.tenant));
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

  getTenantSelection(credentials: ICredentials[]): Promise<
    {
      name: string;
    }[]
  > {
    const tenantIds = credentials.map((tmp) => ({ name: tmp.tenant }));
    const response = new Subject<{ name: string }[]>();
    const promise = response
      .asObservable()
      .pipe(take(1))
      .toPromise()
      .then((res) => {
        if (!res) {
          return Promise.reject();
        }
        return res;
      });
    this.modalService.show(TenantSelectionComponent, {
      initialState: { response, tenants: tenantIds } as Partial<TenantSelectionComponent>,
      ignoreBackdropClick: true
    });
    return promise;
  }
}
