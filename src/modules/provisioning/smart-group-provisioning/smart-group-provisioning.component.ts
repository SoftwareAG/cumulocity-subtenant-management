import { Component } from '@angular/core';
import { IManagedObject } from '@c8y/client';
import { AlertService, Column, ColumnDataType, ModalService } from '@c8y/ngx-components';
import { TenantSelectionComponent } from '@modules/shared/tenant-selection/tenant-selection.component';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { Subject } from 'rxjs';
import { BsModalService } from 'ngx-bootstrap/modal';
import { SmartGroupTableDatasourceService } from './smart-group-table-datasource.service';
import { filter, take } from 'rxjs/operators';
import { ProvisioningService } from '@services/provisioning.service';

@Component({
  providers: [SmartGroupTableDatasourceService],
  selector: 'ps-smart-group-provisioning',
  templateUrl: './smart-group-provisioning.component.html'
})
export class SmartGroupsProvisioningComponent {
  columns: Column[];
  constructor(
    public datasource: SmartGroupTableDatasourceService,
    private credService: FakeMicroserviceService,
    private c8yModalService: ModalService,
    private modalService: BsModalService,
    private alertService: AlertService,
    private provisioning: ProvisioningService
  ) {
    this.columns = this.getDefaultColumns();
  }

  getDefaultColumns(): Column[] {
    return [
      {
        name: 'name',
        header: 'Name',
        path: 'name',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: true
      },
      {
        name: 'query',
        header: 'Query',
        path: 'c8y_DeviceQueryString',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
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

  async provisionSmartGroup(group: IManagedObject): Promise<void> {
    try {
      const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
      const tenantIds = credentials.map((tmp) => ({ name: tmp.tenant }));
      const response = new Subject<{ name: string }[]>();
      response
        .asObservable()
        .pipe(
          take(1),
          filter((tmp) => !!tmp)
        )
        .subscribe(async (res) => {
          const tenantsIds = res.map((tmp) => tmp.name);
          const filteredCredentials = credentials.filter((cred) => tenantsIds.includes(cred.tenant));
          if (filteredCredentials.length) {
            try {
              await this.c8yModalService.confirm(
                `Provisioning Smart Group`,
                `Are you sure that you want to provision the Global Role (${group.name}) to all selected ${filteredCredentials.length} subtenants? This will create a new Smart Group on tenants where it did not exist previously. If the same Smart Group was already provisioned previously, it's properties will be overwritten.`,
                'warning'
              );
              const clients = this.credService.createClients(filteredCredentials);
              this.provisioning.provisionSmartGroupToTenants(clients, group).then(
                () => {
                  this.alertService.success(`Provisioned Smart Group to ${clients.length} subtenants.`);
                },
                (error) => {
                  this.alertService.danger(
                    'Failed to provision Smart Group to all selected subtenants.',
                    JSON.stringify(error)
                  );
                }
              );
            } catch (e) {}
          } else {
            this.alertService.info('No Tenant selected.');
          }
        });
      this.modalService.show(TenantSelectionComponent, {
        initialState: { response, tenants: tenantIds } as Partial<TenantSelectionComponent>,
        ignoreBackdropClick: true
      });
    } catch (e) {
      return;
    }
  }

  async deleteSmartGroup(group: IManagedObject): Promise<void> {
    try {
      const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
      const tenantIds = credentials.map((tmp) => ({ name: tmp.tenant }));
      const response = new Subject<{ name: string }[]>();
      response
        .asObservable()
        .pipe(
          take(1),
          filter((tmp) => !!tmp)
        )
        .subscribe(async (res) => {
          const tenantsIds = res.map((tmp) => tmp.name);
          const filteredCredentials = credentials.filter((cred) => tenantsIds.includes(cred.tenant));
          if (filteredCredentials.length) {
            try {
              await this.c8yModalService.confirm(
                `Delete Smart Group`,
                `Are you sure that you want to delete the Smart Group (${group.name}) from all selected ${filteredCredentials.length} subtenants?`,
                'danger'
              );
              const clients = this.credService.createClients(filteredCredentials);
              this.provisioning.removeSmartGroupFromTenants(clients, group).then(
                () => {
                  this.alertService.success(`Deleted Smart Group from ${clients.length} subtenants.`);
                },
                (error) => {
                  this.alertService.danger(
                    'Failed to delete Smart Group from all selected subtenants.',
                    JSON.stringify(error)
                  );
                }
              );
            } catch (e) {}
          } else {
            this.alertService.info('No Tenant selected.');
          }
        });
      this.modalService.show(TenantSelectionComponent, {
        initialState: { response, tenants: tenantIds } as Partial<TenantSelectionComponent>,
        ignoreBackdropClick: true
      });
    } catch (e) {
      return;
    }
  }
}
