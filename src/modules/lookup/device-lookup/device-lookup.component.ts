import { Component, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IManagedObject } from '@c8y/client';
import {
  AlertService,
  BulkActionControl,
  Column,
  ColumnDataType,
  DataGridComponent,
  ModalService
} from '@c8y/ngx-components';
import { DeviceAction } from '@models/extensions';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Subject, Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { ConfigurationUpdateModalComponent } from '../modals/configuration-update-modal/configuration-update-modal.component';
import { CustomFirmwareUpdateModalComponent } from '../modals/custom-firmware-update-modal/custom-firmware-update-modal.component';
import { FirmwareUpdateModalComponent } from '../modals/firmware-update-modal/firmware-update-modal.component';
import { DeviceTableDatasourceService } from './device-table-datasource.service';

@Component({
  providers: [DeviceTableDatasourceService],
  selector: 'ps-device-lookup',
  templateUrl: './device-lookup.component.html'
})
export class DeviceLookupComponent implements OnDestroy {
  @ViewChild(DataGridComponent, { static: true }) dataGrid: DataGridComponent;
  columns: Column[];
  bulkActionControls: BulkActionControl[] = [
    {
      type: 'Restart',
      icon: 'refresh',
      text: 'Restart',
      callback: (selectedItemIds): void =>
        this.restartDevices(selectedItemIds as any as { tenant: string; id: string }[])
    },
    {
      type: 'Firmware Update',
      icon: 'floppy-o',
      text: 'Firmware Update',
      callback: (selectedItemIds): Promise<void> =>
        this.updateFirmware(selectedItemIds as any as { tenant: string; id: string }[])
    }
  ];
  private queryParamSub: Subscription;

  constructor(
    private credService: FakeMicroserviceService,
    private c8yModalService: ModalService,
    private modalService: BsModalService,
    private alertService: AlertService,
    public datasource: DeviceTableDatasourceService,
    private route: ActivatedRoute
  ) {
    this.columns = this.getDefaultColumns();
    this.queryParamSub = this.route.queryParams.subscribe((params) => {
      const columns = this.dataGrid ? this.dataGrid.columns : this.columns;
      if (params && this.columns && this.columns.length) {
        const paramKeys = Object.keys(params);
        let paramChanged = false;
        columns.forEach((col) => {
          if (paramKeys.includes(col.name)) {
            if (col.filterPredicate !== params[col.name]) {
              paramChanged = true;
              col.filterPredicate = params[col.name];
            }
          } else {
            if (col.filterPredicate) {
              paramChanged = true;
              col.filterPredicate = undefined;
            }
          }
        });
        if (paramChanged && this.dataGrid) {
          this.dataGrid.reload();
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.queryParamSub) {
      this.queryParamSub.unsubscribe();
    }
  }

  getDefaultColumns(): Column[] {
    return [
      { name: 'id', header: 'ID', path: 'data.id', dataType: ColumnDataType.TextShort, sortable: false },
      {
        name: 'tenant',
        header: 'Tenant Id',
        path: 'tenantId',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
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
        name: 'firmwareName',
        header: 'Firmware Name',
        path: 'data.c8y_Firmware.name',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true,
        visible: false
      },
      {
        name: 'firmwareVersion',
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

  restartDevice(deviceItem: TenantSpecificDetails<IManagedObject>): void {
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

  restartDevices(selection: { tenant: string; id: string }[]): void {
    this.c8yModalService.confirm(`Restart Devices`, 'Are you sure that you want to restart the selected Devices?').then(
      async () => {
        // modal confirmed
        const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
        const clients = await this.credService.createClients(credentials);
        const promArray = selection.map((item) => {
          const client = clients.find((tmpClient) => tmpClient.core.tenant === item.tenant);
          if (!client) {
            this.alertService.warning('No credentials found.');
          }
          return client.operation.create({
            deviceId: item.id,
            description: 'Restart device',
            c8y_Restart: {}
          });
        });
        Promise.all(promArray).then(
          () => {
            this.alertService.success(`${promArray.length} Restart Operations created.`);
          },
          () => {
            this.alertService.danger('Unable to create Restart Operations.');
          }
        );
      },
      () => {
        // model canceled
      }
    );
  }

  async updateFirmware(selection: { tenant: string; id: string }[]): Promise<void> {
    const response = new Subject<{ name: string; version: string; url: string }>();
    response
      .asObservable()
      .pipe(
        take(1),
        filter((tmp) => !!tmp)
      )
      .subscribe(async (selectedFirmware) => {
        this.c8yModalService
          .confirm(`Firmware Update`, 'Are you sure that you want to update the selected Devices?')
          .then(
            async () => {
              // modal confirmed
              const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
              const clients = await this.credService.createClients(credentials);
              const promArray = selection.map((item) => {
                const client = clients.find((tmpClient) => tmpClient.core.tenant === item.tenant);
                if (!client) {
                  this.alertService.warning('No credentials found.');
                }
                return client.operation.create({
                  deviceId: item.id,
                  description: `Update firmware to: "${selectedFirmware.name}" (version: ${selectedFirmware.version})`,
                  c8y_Firmware: {
                    name: selectedFirmware.name,
                    version: selectedFirmware.version,
                    url: selectedFirmware.url
                  }
                });
              });
              Promise.all(promArray).then(
                () => {
                  this.alertService.success(`${promArray.length} Firmware Update Operations created.`);
                },
                () => {
                  this.alertService.danger('Unable to create Firmware Update Operations.');
                }
              );
            },
            () => {
              // model canceled
            }
          );
      });
    this.modalService.show(CustomFirmwareUpdateModalComponent, { initialState: { response } });
  }

  async firmwareUpdate(deviceItem: TenantSpecificDetails<IManagedObject>): Promise<void> {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = await this.credService.createClients(credentials);
    const client = clients.find((tmpClient) => tmpClient.core.tenant === deviceItem.tenantId);
    if (!client) {
      this.alertService.warning('No credentials found.');
    }
    this.modalService.show(FirmwareUpdateModalComponent, { initialState: { client, deviceDetails: deviceItem } });
  }

  async configurationUpdate(deviceItem: TenantSpecificDetails<IManagedObject>): Promise<void> {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = await this.credService.createClients(credentials);
    const client = clients.find((tmpClient) => tmpClient.core.tenant === deviceItem.tenantId);
    if (!client) {
      this.alertService.warning('No credentials found.');
    }
    this.modalService.show(ConfigurationUpdateModalComponent, { initialState: { client, deviceDetails: deviceItem } });
  }

  public async performCustomAction(
    action: DeviceAction,
    deviceItem: TenantSpecificDetails<IManagedObject>
  ): Promise<void> {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = await this.credService.createClients(credentials);
    const client = clients.find((tmpClient) => tmpClient.core.tenant === deviceItem.tenantId);
    if (!client) {
      this.alertService.warning('No credentials found.');
    }
    if (action && action.onClickAction) {
      action.onClickAction(client, deviceItem.data as IManagedObject);
    }
  }
}
