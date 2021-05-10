import { Component, OnInit } from '@angular/core';
import { Client, IManagedObject } from '@c8y/client';
import { AlertService, ModalService } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { DeviceDetailsService } from '@services/device-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';
import { take, filter } from 'rxjs/operators';
import { ConfigurationUpdateModalComponent } from '../modals/configuration-update-modal/configuration-update-modal.component';
import { FirmwareUpdateModalComponent } from '../modals/firmware-update-modal/firmware-update-modal.component';
import { LoadQueryModalComponent } from '../modals/load-query-modal/load-query-modal.component';
import { StoreQueryModalComponent } from '../modals/store-query-modal/store-query-modal.component';

@Component({
  selector: 'ps-device-lookup',
  templateUrl: './device-lookup.component.html'
})
export class DeviceLookupComponent implements OnInit {
  private clients: Client[] = [];
  private imeiPath = 'c8y_Mobile.imei';
  private iccidPath = 'c8y_Mobile.iccid';

  set imeiSearchString(val: string) {
    this.imeiSearchStringValue = val;
    this.updateQuery();
  }
  get imeiSearchString() {
    return this.imeiSearchStringValue;
  }
  imeiSearchStringValue = '';
  set iccidSearchString(val: string) {
    this.iccidSearchStringValue = val;
    this.updateQuery();
  }
  get iccidSearchString() {
    return this.iccidSearchStringValue;
  }
  iccidSearchStringValue = '';
  query = 'has(c8y_IsDevice)';

  response: TenantSpecificDetails<Partial<IManagedObject>>[] = [];
  isLoading = false;

  columnConfig = {
    name: true,
    type: true,
    imei: true,
    iccid: false,
    firmware: true,
    requiredAvail: false,
    alarms: false,
    registrationDate: false,
    lastUpdate: true,
    lastMessage: true,
    c8y_Connection: false,
    c8y_Availability: false,
    actions: false
  };

  constructor(
    private credService: FakeMicroserviceService,
    private deviceDetailsService: DeviceDetailsService,
    private c8yModalService: ModalService,
    private modalService: BsModalService,
    private alertService: AlertService
  ) {}

  ngOnInit() {}

  updateQuery() {
    let tmpQuery = '';
    if (this.imeiSearchString) {
      tmpQuery += `(${this.imeiPath} eq '*${this.imeiSearchString}*')`;
    }
    if (this.iccidSearchString) {
      const query = `(${this.iccidPath} eq '*${this.iccidSearchString}*')`;
      if (tmpQuery) {
        tmpQuery += ' and ' + query;
      } else {
        tmpQuery += query;
      }
    }

    this.query = tmpQuery ? '$filter=' + tmpQuery : '';
  }

  lookup() {
    this.isLoading = true;
    this.credService.prepareCachedDummyMicroserviceForAllSubtenants().then(
      async (credentials) => {
        const clients = this.credService.createClients(credentials);
        this.clients = clients;
        this.response = await this.deviceDetailsService.deviceLookup(clients, this.query);
        this.response.sort((a, b) => a.tenantId.localeCompare(b.tenantId));
        this.isLoading = false;
      },
      (e) => {
        console.error(e);
        this.isLoading = false;
      }
    );
  }

  restartDevice(deviceItem: TenantSpecificDetails<Partial<IManagedObject>>) {
    this.c8yModalService
      .confirm(`Restart Device: ${deviceItem.data.name}`, 'Are you sure that you want to restart this device?')
      .then(
        (res) => {
          // modal confirmed
          const client = this.clients.find((tmpClient) => tmpClient.core.tenant === deviceItem.tenantId);
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
              (result) => {
                this.alertService.success('Restart Operation created.');
              },
              (error) => {
                this.alertService.danger('Unable to create Restart Operation.');
              }
            );
        },
        (error) => {
          // model canceled
        }
      );
  }

  firmwareUpdate(deviceItem: TenantSpecificDetails<Partial<IManagedObject>>) {
    const client = this.clients.find((tmpClient) => tmpClient.core.tenant === deviceItem.tenantId);
    if (!client) {
      this.alertService.warning('No credentials found.');
    }
    this.modalService.show(FirmwareUpdateModalComponent, { initialState: { client, deviceDetails: deviceItem } });
  }

  configurationUpdate(deviceItem: TenantSpecificDetails<Partial<IManagedObject>>) {
    const client = this.clients.find((tmpClient) => tmpClient.core.tenant === deviceItem.tenantId);
    if (!client) {
      this.alertService.warning('No credentials found.');
    }
    this.modalService.show(ConfigurationUpdateModalComponent, { initialState: { client, deviceDetails: deviceItem } });
  }

  storeQuery() {
    this.modalService.show(StoreQueryModalComponent, { initialState: { query: this.query } });
  }

  loadQuery() {
    const response = new Subject<string>();
    response
      .asObservable()
      .pipe(
        take(1),
        filter((tmp) => !!tmp)
      )
      .subscribe((res) => {
        this.query = res;
      });
    this.modalService.show(LoadQueryModalComponent, { initialState: { response }, ignoreBackdropClick: true });
  }
}
