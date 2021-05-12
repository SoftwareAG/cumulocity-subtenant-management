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
    // {
    //   type: BuiltInActionType.Export,
    //   callback: (selectedItemIds) => console.dir(selectedItemIds)
    // }
    // {
    //   type: BuiltInActionType.Delete,
    //   callback: (selectedItemIds) => console.dir(selectedItemIds),
    // },
  ];

  constructor(
    public datasource: SmartrestTableDatasourceService,
    private credService: FakeMicroserviceService,
    private provisioning: ProvisioningService,
    private alertService: AlertService,
    private c8yModalService: ModalService
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

  handleItemsSelect(selectedItemIds: string[]): void {
    console.log('selected item ids:');
    console.dir(selectedItemIds);
  }

  provisionItem(item: IManagedObject): void {
    this.c8yModalService
      .confirm(
        `Provisioning SmartREST template`,
        'Are you sure that you want to provision this SmartREST template to all of your subtenants? This will create a new template on tenants where it did not exist previously. If a Template with the same id already exists, it will be overwritten.',
        'warning'
      )
      .then(
        async () => {
          // modal confirmed
          this.provisioningOngoing = true;
          this.credService.prepareCachedDummyMicroserviceForAllSubtenants().then(
            (credentials) => {
              const clients = this.credService.createClients(credentials);
              this.provisioning.provisionSmartRESTTemplate(clients, item.id).then(
                () => {
                  this.provisioningOngoing = false;
                  this.alertService.success('Provisioned SmartREST Template to subtenants.');
                },
                (error) => {
                  this.provisioningOngoing = false;
                  this.alertService.danger(
                    'Failed to provision SmartREST Template to subtenants.',
                    JSON.stringify(error)
                  );
                }
              );
            },
            () => {
              this.provisioningOngoing = false;
            }
          );
        },
        () => {
          // model canceled
        }
      );
  }
}
