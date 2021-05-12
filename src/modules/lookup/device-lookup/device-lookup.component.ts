import { Component } from '@angular/core';
import { IManagedObject } from '@c8y/client';
import { AlertService, Column, ColumnDataType, ModalService } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ConfigurationUpdateModalComponent } from '../modals/configuration-update-modal/configuration-update-modal.component';
import { FirmwareUpdateModalComponent } from '../modals/firmware-update-modal/firmware-update-modal.component';
import { DeviceTableDatasourceService } from './device-table-datasource.service';

@Component({
  providers: [DeviceTableDatasourceService],
  selector: 'ps-device-lookup',
  templateUrl: './device-lookup.component.html'
})
export class DeviceLookupComponent {
  columns: Column[];

  constructor(
    private credService: FakeMicroserviceService,
    private c8yModalService: ModalService,
    private modalService: BsModalService,
    private alertService: AlertService,
    public datasource: DeviceTableDatasourceService
  ) {
    this.columns = this.getDefaultColumns();
  }

  getDefaultColumns(): Column[] {
    return [
      { name: 'id', header: 'ID', path: 'data.id', dataType: ColumnDataType.TextShort, sortable: false },
      {
        name: 'tenant',
        header: 'Tenant',
        path: 'tenantId',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'name',
        header: 'Name',
        path: 'data.name',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
      },
      {
        name: 'type',
        header: 'Type',
        path: 'data.type',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
      },
      {
        name: 'imei',
        header: 'IMEI',
        path: 'data.c8y_Mobile.imei',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true,
        visible: false
      },
      {
        name: 'iccid',
        header: 'ICCID',
        path: 'data.c8y_Mobile.iccid',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true,
        visible: false
      },
      {
        name: 'firmware_name',
        header: 'Firmware Name',
        path: 'data.c8y_Firmware.name',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true,
        visible: false
      },
      {
        name: 'firmware_version',
        header: 'Firmware Version',
        path: 'data.c8y_Firmware.version',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true,
        visible: false
      },
      {
        name: 'required_availability',
        header: 'Required Availability',
        path: 'data.c8y_RequiredAvailability.responseInterval',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true,
        visible: false
      },
      {
        name: 'alarms',
        header: 'Alarms',
        path: 'data.c8y_ActiveAlarmsStatus',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: false
      },
      {
        name: 'creationTime',
        header: 'Creation Time',
        path: 'data.creationTime',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: false
      },
      {
        name: 'lastMessage',
        header: 'Last Message',
        path: 'data.c8y_Availability.lastMessage',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true,
        visible: false
      },
      {
        name: 'availability',
        header: 'Availability',
        path: 'data.c8y_Availability.status',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true,
        visible: false
      },
      {
        name: 'connection',
        header: 'Connection Status',
        path: 'data.c8y_Connection.status',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true,
        visible: false
      },
      {
        header: 'Last Updated',
        name: 'lastUpdated',
        sortable: false,
        path: 'data.lastUpdated',
        dataType: ColumnDataType.TextShort
      },
      {
        header: 'Actions',
        name: 'actions1',
        sortable: false
      }
    ];
  }

  restartDevice(deviceItem: TenantSpecificDetails<Partial<IManagedObject>>): void {
    this.c8yModalService
      .confirm(`Restart Device: ${deviceItem.data.name}`, 'Are you sure that you want to restart this device?')
      .then(
        async () => {
          // modal confirmed
          const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
          const clients = await this.credService.createClients(credentials);
          const client = clients.find((tmpClient) => tmpClient.core.tenant === deviceItem.tenantId);
          if (!client) {
            this.alertService.warning('No credentials found.');
          }
          client.operation
            .create({
              deviceId: deviceItem.data.id,
              description: 'Restart device',
              c8y_Restart: {}
            })
            .then(
              () => {
                this.alertService.success('Restart Operation created.');
              },
              () => {
                this.alertService.danger('Unable to create Restart Operation.');
              }
            );
        },
        () => {
          // model canceled
        }
      );
  }

  async firmwareUpdate(deviceItem: TenantSpecificDetails<Partial<IManagedObject>>): Promise<void> {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = await this.credService.createClients(credentials);
    const client = clients.find((tmpClient) => tmpClient.core.tenant === deviceItem.tenantId);
    if (!client) {
      this.alertService.warning('No credentials found.');
    }
    this.modalService.show(FirmwareUpdateModalComponent, { initialState: { client, deviceDetails: deviceItem } });
  }

  async configurationUpdate(deviceItem: TenantSpecificDetails<Partial<IManagedObject>>): Promise<void> {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = await this.credService.createClients(credentials);
    const client = clients.find((tmpClient) => tmpClient.core.tenant === deviceItem.tenantId);
    if (!client) {
      this.alertService.warning('No credentials found.');
    }
    this.modalService.show(ConfigurationUpdateModalComponent, { initialState: { client, deviceDetails: deviceItem } });
  }
}
