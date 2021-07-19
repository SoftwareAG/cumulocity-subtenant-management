import { Component } from '@angular/core';
import { IManagedObject } from '@c8y/client';
import {
  ActionControl,
  AlertService,
  BuiltInActionType,
  BulkActionControl,
  Column,
  ColumnDataType,
  ModalService
} from '@c8y/ngx-components';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { ProvisioningService } from '@services/provisioning.service';
import { SmartrestTableDatasourceService } from './smartrest-table-datasource.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { TenantSelectionComponent } from '@modules/shared/tenant-selection/tenant-selection.component';
import { Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Component({
  providers: [SmartrestTableDatasourceService],
  selector: 'ps-smartrest-provisioning',
  templateUrl: './smartrest-provisioning.component.html'
})
export class SmartrestProvisioningComponent {
  title: string;
  columns: Column[];

  provisioningOngoing = false;

  actionControls: ActionControl[] = [
    // { type: BuiltInActionType.Delete, callback: (item) => console.log(this.columns) },
    // {
    //   icon: 'reply',
    //   text: 'test',
    //   type: BuiltInActionType.Export,
    //   callback: (item) => console.log(item)
    // }
    // { type: BuiltInActionType.Edit, callback: (item) => console.dir(item) },
  ];
  bulkActionControls: BulkActionControl[] = [
    {
      type: '(Re-)Provision',
      icon: 'refresh',
      text: '(Re-)Provision',
      callback: (selectedItemIds): Promise<void> => this.provisioningItemToTenantSelection(selectedItemIds)
    }
  ];

  constructor(
    public datasource: SmartrestTableDatasourceService,
    private credService: FakeMicroserviceService,
    private provisioning: ProvisioningService,
    private alertService: AlertService,
    private c8yModalService: ModalService,
    private modalService: BsModalService
  ) {
    this.columns = this.getDefaultColumns();
  }

  getDefaultColumns(): Column[] {
    return [
      { name: 'id', header: 'ID', path: 'id', dataType: ColumnDataType.TextShort },
      {
        name: 'name',
        header: 'Name',
        path: 'name',
        dataType: ColumnDataType.TextShort,
        sortable: true,
        filterable: true
      },
      {
        name: 'type',
        header: 'Type',
        path: 'type',
        dataType: ColumnDataType.TextShort,
        sortable: false
      },
      {
        name: 'requestTemplates',
        header: 'Request Templates',
        path: 'com_cumulocity_model_smartrest_csv_CsvSmartRestTemplate.requestTemplates',
        dataType: ColumnDataType.TextShort,
        sortable: false
      },
      {
        name: 'responseTemplates',
        header: 'Response Templates',
        path: 'com_cumulocity_model_smartrest_csv_CsvSmartRestTemplate.responseTemplates',
        dataType: ColumnDataType.TextShort,
        sortable: false
      },
      {
        name: 'version',
        header: 'SmartREST Version',
        path: '',
        dataType: ColumnDataType.TextShort,
        sortable: false
      },
      {
        header: 'Last Updated',
        name: 'lastUpdated',
        sortable: true,
        path: 'lastUpdated',
        sortOrder: 'desc',
        dataType: ColumnDataType.TextShort
      },
      {
        header: 'Actions',
        name: 'actions1',
        sortable: false
      }
    ];
  }

  async provisioningItemToTenantSelection(items: string[]): Promise<void> {
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
              `Provisioning SmartREST template(s)`,
              `Are you sure that you want to provision the selected SmartREST template(s) to all selected ${filteredCredentials.length} subtenants? This will create a new template on tenants where it did not exist previously. If a Template with the same id already exists, it will be overwritten.`,
              'warning'
            );
            const clients = this.credService.createClients(filteredCredentials);
            this.provisioningOngoing = true;
            this.provisioning.provisionSmartRESTTemplates(clients, items).then(
              () => {
                this.provisioningOngoing = false;
                this.alertService.success(`Provisioned SmartREST Template(s) to ${clients.length} subtenants.`);
              },
              (error) => {
                this.provisioningOngoing = false;
                this.alertService.danger(
                  'Failed to provision SmartREST Template(s) to all selected subtenants.',
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
      initialState: { response, tenants: tenantIds },
      ignoreBackdropClick: true
    });
  }
}
