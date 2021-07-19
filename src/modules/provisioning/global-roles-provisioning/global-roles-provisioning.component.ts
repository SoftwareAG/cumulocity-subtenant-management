import { Component } from '@angular/core';
import { IUserGroup } from '@c8y/client';
import { AlertService, Column, ColumnDataType, ModalService } from '@c8y/ngx-components';
import { TenantSelectionComponent } from '@modules/shared/tenant-selection/tenant-selection.component';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { Subject } from 'rxjs';
import { BsModalService } from 'ngx-bootstrap/modal';
import { GlobalRolesTableDatasourceService } from './global-roles-table-datasource.service';
import { filter, take } from 'rxjs/operators';
import { ProvisioningService } from '@services/provisioning.service';

@Component({
  providers: [GlobalRolesTableDatasourceService],
  selector: 'ps-global-roles-provisioning',
  templateUrl: './global-roles-provisioning.component.html'
})
export class GlobalRolesProvisioningComponent {
  columns: Column[];
  constructor(
    public datasource: GlobalRolesTableDatasourceService,
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
        name: 'description',
        header: 'description',
        path: 'description',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'roles',
        header: 'roles',
        path: 'roles',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'applications',
        header: 'applications',
        path: 'applications',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      // {
      //   name: 'users',
      //   header: 'users',
      //   path: 'users',
      //   dataType: ColumnDataType.TextShort,
      //   sortable: false,
      //   filterable: false,
      //   visible: true
      // },
      {
        header: 'Actions',
        name: 'actions1',
        sortable: false,
        filterable: false
        // visible: false
      }
    ];
  }

  async provisionGlobalRole(role: IUserGroup): Promise<void> {
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
                `Provisioning Global Role`,
                `Are you sure that you want to provision the Global Role (${role.name}) to all selected ${filteredCredentials.length} subtenants? This will create a new Global Role on tenants where it did not exist previously. If a same Global Role was already provisioned previously, it's properties will be overwritten.`,
                'warning'
              );
              const clients = this.credService.createClients(filteredCredentials);
              this.provisioning.provisionUserGroupToTenants(clients, role).then(
                () => {
                  this.alertService.success(`Provisioned Global Role to ${clients.length} subtenants.`);
                },
                (error) => {
                  this.alertService.danger(
                    'Failed to provision Global Role to all selected subtenants.',
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

  async deleteGlobalRole(role: IUserGroup): Promise<void> {
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
                `Delete Global Role`,
                `Are you sure that you want to delete the Global Role (${role.name}) from all selected ${filteredCredentials.length} subtenants?`,
                'danger'
              );
              const clients = this.credService.createClients(filteredCredentials);
              this.provisioning.removeUserGroupFromTenants(clients, role).then(
                () => {
                  this.alertService.success(`Deleted Global Role from ${clients.length} subtenants.`);
                },
                (error) => {
                  this.alertService.danger(
                    'Failed to delete Global Role from all selected subtenants.',
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
