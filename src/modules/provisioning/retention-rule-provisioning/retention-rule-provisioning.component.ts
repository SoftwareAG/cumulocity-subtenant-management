import { Component, EventEmitter } from '@angular/core';
import { Client } from '@c8y/client';
import { AlertService, Column, ColumnDataType, ModalService } from '@c8y/ngx-components';
import { IRetention } from '@models/retention';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { RetentionRuleTableDatasourceService } from './retention-rule-table-datasource.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { CreateOrEditRetentionRuleModalComponent } from '../modals/create-or-edit-retention-rule/create-or-edit-retention-rule-modal.component';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { TenantSelectionService } from '@modules/shared/tenant-selection/tenant-selection.service';

@Component({
  providers: [RetentionRuleTableDatasourceService],
  selector: 'ps-retention-rule-provisioning',
  templateUrl: './retention-rule-provisioning.component.html'
})
export class RetentionRuleProvisioningComponent {
  columns: Column[];
  refresh = new EventEmitter<any>();

  constructor(
    public datasource: RetentionRuleTableDatasourceService,
    private credService: FakeMicroserviceService,
    private c8yModal: ModalService,
    private alertService: AlertService,
    private modalService: BsModalService,
    private tenantSelectionService: TenantSelectionService
  ) {
    this.columns = this.getDefaultColumns();
  }

  getDefaultColumns(): Column[] {
    return [
      {
        name: 'tenant',
        header: 'Tenant Id',
        path: 'tenantId',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
      },
      {
        name: 'editable',
        header: 'Editable',
        path: 'data.editable',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: false
      },
      {
        name: 'dataType',
        header: 'dataType',
        path: 'data.dataType',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
      },
      {
        name: 'fragmentType',
        header: 'fragmentType',
        path: 'data.fragmentType',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
      },
      {
        name: 'source',
        header: 'source',
        path: 'data.source',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
      },
      {
        name: 'type',
        header: 'type',
        path: 'data.type',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true,
        visible: false
      },
      {
        name: 'maximumAge',
        header: 'maximumAge',
        path: 'data.maximumAge',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
      },
      {
        header: 'Actions',
        name: 'actions1',
        sortable: false,
        filterable: false
        // visible: false
      }
    ];
  }

  async editRule(context: TenantSpecificDetails<IRetention>): Promise<void> {
    try {
      const updatedRule = await this.openUpdateRetentionRuleModal(context.data);
      const creds = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
      const foundCred = creds.find((tmp) => tmp.tenant === context.tenantId);
      if (foundCred) {
        const clients = this.credService.createClients([foundCred]);
        const client = clients[0];
        this.c8yModal
          .confirm(`Update Retention Rule`, 'Are you sure that you want to update this retention rule?')
          .then(
            () => {
              this.performUpdate(client, updatedRule).then(
                () => {
                  this.alertService.success('Retention rule updated');
                  this.datasource.resetCache();
                  this.refresh.emit();
                },
                () => {
                  this.alertService.warning('Failed to update Retention rule');
                }
              );
            },
            () => {
              // nothing
            }
          );
      }
    } catch (e) {
      return;
    }
  }

  async deleteRule(context: TenantSpecificDetails<IRetention>): Promise<void> {
    const creds = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const foundCred = creds.find((tmp) => tmp.tenant === context.tenantId);
    if (foundCred) {
      const clients = this.credService.createClients([foundCred]);
      const client = clients[0];
      this.c8yModal.confirm(`Delete Retention Rule`, 'Are you sure that you want to delete this retention rule?').then(
        () => {
          this.performDeletion(client, context.data.id).then(
            () => {
              this.alertService.success('Retention rule deleted');
              this.datasource.resetCache();
              this.refresh.emit();
            },
            () => {
              this.alertService.warning('Failed to delete Retention rule');
            }
          );
        },
        () => {
          // nothing
        }
      );
    }
  }

  async createNewRetentionRule(): Promise<void> {
    try {
      const initialRule: Partial<IRetention> = {
        dataType: '*',
        editable: true,
        fragmentType: '*',
        type: '*',
        source: '*',
        maximumAge: 60
      };
      const configuredRule = await this.openUpdateRetentionRuleModal(initialRule);
      const clients = await this.openTenantSelectionModal();
      if (clients.length) {
        const promArray = clients.map((client) => this.performCreate(client, configuredRule));
        Promise.all(promArray).then(
          () => {
            this.alertService.success('Retention rules created');
            this.datasource.resetCache();
            this.refresh.emit();
          },
          (error) => {
            this.alertService.warning('Failed to create all Retention Rules');
          }
        );
      }
    } catch (e) {
      return;
    }
  }

  async openTenantSelectionModal(): Promise<Client[]> {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const tenantIds = credentials.map((tmp) => tmp.tenant);

    const selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenantIds);

    const filteredCredentials = credentials.filter((cred) => selectedTenantIds.includes(cred.tenant));
    return this.credService.createClients(filteredCredentials);
  }

  openUpdateRetentionRuleModal(rule: Partial<IRetention>): Promise<IRetention> {
    const response = new Subject<IRetention>();
    const promise = response
      .asObservable()
      .pipe(take(1))
      .toPromise()
      .then((result) => {
        if (!result) {
          throw 'modal canceled';
        }
        return result;
      });
    this.modalService.show(CreateOrEditRetentionRuleModalComponent, {
      ignoreBackdropClick: true,
      initialState: {
        response,
        rule: Object.assign({}, rule)
      } as Partial<CreateOrEditRetentionRuleModalComponent>
    });
    return promise;
  }

  performDeletion(client: Client, id: string): Promise<void> {
    return client.core.fetch(`/retention/retentions/${id}`, { method: 'DELETE' } as RequestInit).then((res) => {
      if (res.status !== 204) {
        throw res;
      }
    });
  }

  performUpdate(client: Client, update: IRetention): Promise<void> {
    return client.core
      .fetch(`/retention/retentions/${update.id}`, {
        method: 'PUT',
        body: JSON.stringify(update),
        headers: { 'Content-Type': 'application/json' }
      } as RequestInit)
      .then((res) => {
        if (res.status !== 200) {
          throw res;
        }
      });
  }

  performCreate(client: Client, update: IRetention): Promise<void> {
    return client.core
      .fetch(`/retention/retentions`, {
        method: 'POST',
        body: JSON.stringify(update),
        headers: { 'Content-Type': 'application/json' }
      } as RequestInit)
      .then((res) => {
        if (res.status !== 201) {
          throw res;
        }
      });
  }
}
