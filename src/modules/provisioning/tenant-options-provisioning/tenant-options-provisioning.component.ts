import { Component, OnInit } from '@angular/core';
import { ICurrentTenant, ITenantOption, TenantService } from '@c8y/client';
import { AlertService, Column, ColumnDataType, ModalService } from '@c8y/ngx-components';
import { TenantSelectionService } from '@modules/shared/tenant-selection/tenant-selection.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { TenantOptionModalComponent } from '../modals/tenant-option-modal/tenant-option-modal.component';
import { TenantOptionsTableDatasourceService } from './tenant-options-table-datasource.service';
import { ProvisioningService } from '@services/provisioning.service';

@Component({
  providers: [TenantOptionsTableDatasourceService],
  selector: 'ps-tenant-options-provisioning',
  templateUrl: './tenant-options-provisioning.component.html'
})
export class TenantOptionsProvisioningComponent implements OnInit {
  columns: Column[];
  tenant: ICurrentTenant;

  constructor(
    private credService: FakeMicroserviceService,
    private c8yModalService: ModalService,
    private modalService: BsModalService,
    private alertService: AlertService,
    private provisioning: ProvisioningService,
    public datasource: TenantOptionsTableDatasourceService,
    private tenantSelectionService: TenantSelectionService,
    private tenantService: TenantService
  ) {
    this.columns = this.getDefaultColumns();
  }
  ngOnInit(): void {
    this.tenantService.current().then((tenant) => {
      this.tenant = tenant.data;
    });
  }

  getDefaultColumns(): Column[] {
    return [
      {
        name: 'category',
        header: 'Category',
        path: 'category',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'key',
        header: 'Key',
        path: 'key',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'value',
        header: 'Value',
        path: 'value',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        header: 'Actions',
        name: 'actions1',
        sortable: false
      }
    ];
  }

  async provisionTenantOption(option?: ITenantOption): Promise<void> {
    try {
      const tenantOption = await this.getTenantOptionDetails(option);
      const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
      const tenantIds = credentials.map((tmp) => tmp.tenant);
      let selectedTenantIds: string[] = [];
      try {
        selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenantIds);
      } catch (e) {
        this.alertService.warning('Something went wrong during subtenant selection. Please try again.');
        console.warn(e.message);
        return;
      }
      const filteredCredentials = credentials.filter((cred) => selectedTenantIds.includes(cred.tenant));

      try {
        await this.c8yModalService.confirm(
          `Provisioning Tenant Option`,
          `Are you sure that you want to provision the Tenant Option to all selected ${filteredCredentials.length} subtenants? This will create a new tenant option on tenants where it did not exist previously. If a Tenant Option with the same category and key already exists, it's value will be overwritten.`,
          'warning'
        );
        const clients = await this.credService.createClients(filteredCredentials);
        await this.provisioning.provisionTenantOptionToTenants(clients, tenantOption).then(
          () => {
            this.alertService.success(`Provisioned Tenant Option to ${clients.length} subtenants.`);
          },
          (error) => {
            this.alertService.danger(
              'Failed to provision Tenant Option to all selected subtenants.',
              JSON.stringify(error)
            );
          }
        );
      } catch (e) {
        console.warn(e.message);
      }
    } catch (e) {
      console.warn(e.message);
      return;
    }
  }

  async deprovisionTenantOption(option?: ITenantOption): Promise<void> {
    try {
      const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
      const tenantIds = credentials.map((tmp) => tmp.tenant);
      let selectedTenantIds: string[] = [];
      try {
        selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenantIds);
      } catch (e) {
        this.alertService.warning('Something went wrong during subtenant selection. Please try again.');
        console.warn(e.message);
        return;
      }
      const filteredCredentials = credentials.filter((cred) => selectedTenantIds.includes(cred.tenant));

      try {
        await this.c8yModalService.confirm(
          `Deprovisioning Tenant Option`,
          `Are you sure that you want to deprovision the Tenant Option to all selected ${filteredCredentials.length} subtenants? This will delete the selected tenant option on tenants in case this option exists.`,
          'warning'
        );
        const clients = await this.credService.createClients(filteredCredentials);
        await this.provisioning.deprovisionTenantOptionToTenants(clients, option).then(
          () => {
            this.alertService.success(`Deprovisioned Tenant Option to ${clients.length} subtenants.`);
          },
          (error) => {
            this.alertService.danger(
              'Failed to deprovision Tenant Option to all selected subtenants.',
              JSON.stringify(error)
            );
          }
        );
      } catch (e) {
        console.warn(e.message);
      }
    } catch (e) {
      console.warn(e.message);
      return;
    }
  }

  getTenantOptionDetails(partialTenantOption?: ITenantOption): Promise<ITenantOption> {
    const response = new Subject<ITenantOption>();
    const promise = response
      .asObservable()
      .pipe(take(1))
      .toPromise()
      .then((result) => {
        if (!result) {
          throw '';
        }
        return result;
      });
    const initialState: Partial<TenantOptionModalComponent> = {
      response
    };
    if (partialTenantOption) {
      const allowedKeys = ['category', 'key', 'value'];
      const obj = Object.assign({}, partialTenantOption);
      Object.keys(obj).forEach((tmp) => {
        if (!allowedKeys.includes(tmp)) {
          delete obj[tmp];
        }
      });
      initialState.tenantOption = obj;
    }
    this.modalService.show(TenantOptionModalComponent, {
      initialState,
      ignoreBackdropClick: true
    });
    return promise;
  }
}
