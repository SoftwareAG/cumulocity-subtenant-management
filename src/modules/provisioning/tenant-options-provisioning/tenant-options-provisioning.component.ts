import { Component } from '@angular/core';
import { ITenantOption } from '@c8y/client';
import { AlertService, Column, ColumnDataType, ModalService } from '@c8y/ngx-components';
import { TenantSelectionService } from '@modules/shared/tenant-selection/tenant-selection.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { ProvisioningService } from '@services/provisioning.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { TenantOptionModalComponent } from '../modals/tenant-option-modal/tenant-option-modal.component';
import { TenantOptionsTableDatasourceService } from './tenant-options-table-datasource.service';

@Component({
  providers: [TenantOptionsTableDatasourceService],
  selector: 'ps-tenant-options-provisioning',
  templateUrl: './tenant-options-provisioning.component.html'
})
export class TenantOptionsProvisioningComponent {
  columns: Column[];

  constructor(
    private credService: FakeMicroserviceService,
    private c8yModalService: ModalService,
    private modalService: BsModalService,
    private alertService: AlertService,
    private provisioning: ProvisioningService,
    public datasource: TenantOptionsTableDatasourceService,
    private tenantSelectionService: TenantSelectionService
  ) {
    this.columns = this.getDefaultColumns();
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
      } catch (e) {}
    } catch (e) {
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
      console.log(obj);
    }
    this.modalService.show(TenantOptionModalComponent, {
      initialState,
      ignoreBackdropClick: true
    });
    return promise;
  }
}
