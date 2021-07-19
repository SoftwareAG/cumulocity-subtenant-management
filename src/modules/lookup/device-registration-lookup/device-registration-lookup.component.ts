import { Component, EventEmitter } from '@angular/core';
import { IDeviceRegistration } from '@c8y/client';
import { AlertService, Column, ColumnDataType, ModalService } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { DeviceRegistrationDetailsService } from '@services/device-registration-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { DeviceRegistrationTableDatasourceService } from './device-registration-table-datasource.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { filter, take } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AddDeviceRegistrationModalComponent } from '../modals/add-device-registration-modal/add-device-registration-modal.component';

@Component({
  providers: [DeviceRegistrationTableDatasourceService],
  selector: 'ps-device-registration-lookup',
  templateUrl: './device-registration-lookup.component.html'
})
export class DeviceRegistrationLookupComponent {
  columns: Column[];
  refresh = new EventEmitter();

  constructor(
    public datasource: DeviceRegistrationTableDatasourceService,
    private credService: FakeMicroserviceService,
    private c8yModalService: ModalService,
    private alertService: AlertService,
    private modalService: BsModalService,
    private deviceRegistrationDetailsService: DeviceRegistrationDetailsService
  ) {
    this.columns = this.getDefaultColumns();
  }

  getDefaultColumns(): Column[] {
    return [
      {
        name: 'tenant',
        header: 'Tenant Id',
        path: 'tenantId',
        dataType: ColumnDataType.TextShort,
        sortable: true,
        filterable: true
      },
      {
        name: 'id',
        header: 'id',
        path: 'data.id',
        dataType: ColumnDataType.TextShort,
        sortable: true,
        filterable: true
      },
      {
        name: 'status',
        header: 'Status',
        path: 'data.status',
        dataType: ColumnDataType.TextShort,
        sortable: true,
        filterable: true
      },
      {
        name: 'owner',
        header: 'Owner',
        path: 'data.owner',
        dataType: ColumnDataType.TextShort,
        sortable: true,
        filterable: true
      },
      {
        name: 'creationTime',
        header: 'Creation Time',
        path: 'data.creationTime',
        dataType: ColumnDataType.TextShort,
        sortable: true,
        filterable: false
      },
      // {
      //   name: 'email',
      //   header: 'E-Mail',
      //   path: 'data.email',
      //   dataType: ColumnDataType.TextShort,
      //   sortable: false,
      //   filterable: true
      // },
      // {
      //   name: 'firstName',
      //   header: 'Firstname',
      //   path: 'data.firstName',
      //   dataType: ColumnDataType.TextShort,
      //   sortable: false,
      //   filterable: true
      // },
      // {
      //   name: 'lastName',
      //   header: 'Lastname',
      //   path: 'data.lastName',
      //   dataType: ColumnDataType.TextShort,
      //   sortable: false,
      //   filterable: true
      // },
      {
        header: 'Actions',
        name: 'actions1',
        sortable: false
      }
    ];
  }

  acceptRequest(request: TenantSpecificDetails<IDeviceRegistration>): void {
    this.c8yModalService
      .confirm(
        `Accept Device Registration: ${request.data.id}`,
        `Are you sure that you want to accept this device for tenant: ${request.tenantId}?`
      )
      .then(
        async () => {
          // modal confirmed
          const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
          const clients = await this.credService.createClients(credentials);
          const client = clients.find((tmpClient) => tmpClient.core.tenant === request.tenantId);
          if (!client) {
            this.alertService.warning('No credentials found.');
          }
          this.deviceRegistrationDetailsService.acceptRegistrationRequest(client, request.data.id).then(
            () => {
              this.alertService.success('Accepted Device Request.');
              this.datasource.clearCache();
              this.refresh.emit();
            },
            (error) => {
              this.alertService.danger('Unable to accept Device Request.', JSON.stringify(error));
            }
          );
        },
        () => {
          // model canceled
        }
      );
  }

  cancelRequest(request: TenantSpecificDetails<IDeviceRegistration>): void {
    this.c8yModalService
      .confirm(
        `Cancel Device Registration: ${request.data.id}`,
        `Are you sure that you want to cancel this device registration for tenant: ${request.tenantId}?`,
        'warning'
      )
      .then(
        async () => {
          // modal confirmed
          const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
          const clients = await this.credService.createClients(credentials);
          const client = clients.find((tmpClient) => tmpClient.core.tenant === request.tenantId);
          if (!client) {
            this.alertService.warning('No credentials found.');
          }
          this.deviceRegistrationDetailsService.rejectRegistrationRequest(client, request.data.id).then(
            () => {
              this.alertService.success('Canceled Device Request.');
              this.datasource.clearCache();
              this.refresh.emit();
            },
            (error) => {
              this.alertService.danger('Unable to cancel Device Request.', JSON.stringify(error));
            }
          );
        },
        () => {
          // model canceled
        }
      );
  }

  async registerDevice(): Promise<void> {
    const response = new Subject<boolean>();
    response
      .asObservable()
      .pipe(
        take(1),
        filter((tmp) => !!tmp)
      )
      .subscribe(() => {
        this.datasource.clearCache();
        this.refresh.emit();
      });
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = this.credService.createClients(credentials);
    this.modalService.show(AddDeviceRegistrationModalComponent, {
      initialState: { clients, response },
      ignoreBackdropClick: true
    });
  }
}
