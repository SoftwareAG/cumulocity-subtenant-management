import { Component } from '@angular/core';
import { IManagedObject } from '@c8y/client';
import { AlertService, Column, ColumnDataType, ModalService } from '@c8y/ngx-components';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { SmartGroupTableDatasourceService } from './smart-group-table-datasource.service';
import { ProvisioningService } from '@services/provisioning.service';
import { TenantSelectionService } from '@modules/shared/tenant-selection/tenant-selection.service';

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
    private alertService: AlertService,
    private provisioning: ProvisioningService,
    private tenantSelectionService: TenantSelectionService
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
      const tenantIds = credentials.map((tmp) => tmp.tenant) as string[];
      let selectedTenantIds: string[] = [];

      try {
        selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenantIds);
      } catch (e) {
        return;
      }
      const filteredCredentials = credentials.filter((cred) => selectedTenantIds.includes(cred.tenant as string));
      try {
        await this.c8yModalService.confirm(
          `Provisioning Smart Group`,
          `Are you sure that you want to provision the Global Role (${group['name']}) to all selected ${filteredCredentials.length} subtenants? This will create a new Smart Group on tenants where it did not exist previously. If the same Smart Group was already provisioned previously, it's properties will be overwritten.`,
          'warning'
        );
        const clients = await this.credService.createClients(filteredCredentials);
        await this.provisioning.provisionSmartGroupToTenants(clients, group).then(
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
    } catch (e) {
      return;
    }
  }

  async deleteSmartGroup(group: IManagedObject): Promise<void> {
    try {
      const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
      const tenantIds = credentials.map((tmp) => tmp.tenant) as string[];
      let selectedTenantIds: string[] = [];

      try {
        selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenantIds);
      } catch (e) {
        return;
      }
      const filteredCredentials = credentials.filter((cred) => selectedTenantIds.includes(cred.tenant as string));
      try {
        await this.c8yModalService.confirm(
          `Delete Smart Group`,
          `Are you sure that you want to delete the Smart Group (${group['name']}) from all selected ${filteredCredentials.length} subtenants?`,
          'danger'
        );
        const clients = await this.credService.createClients(filteredCredentials);
        await this.provisioning.removeSmartGroupFromTenants(clients, group).then(
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
    } catch (e) {
      return;
    }
  }
}
