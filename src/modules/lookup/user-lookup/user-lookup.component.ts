import { Component, EventEmitter } from '@angular/core';
import { BasicAuth, Client, IUser } from '@c8y/client';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { AlertService, Column, ColumnDataType, ModalService } from '@c8y/ngx-components';
import { UserPasswordChangeModalComponent } from '../modals/user-password-change-modal/user-password-change-modal.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { AddUserModalComponent } from '../modals/add-user-modal/add-user-modal.component';
import { Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { UserTableDatasourceService } from './user-table-datasource.service';
import { SubtenantDetailsService } from '@services/subtenant-details.service';

@Component({
  providers: [UserTableDatasourceService],
  selector: 'ps-user-lookup',
  templateUrl: './user-lookup.component.html'
})
export class UserLookupComponent {
  columns: Column[];
  refresh = new EventEmitter();

  constructor(
    private credService: FakeMicroserviceService,
    private c8yModalService: ModalService,
    private alertService: AlertService,
    private modalService: BsModalService,
    public datasource: UserTableDatasourceService,
    private tenantDetails: SubtenantDetailsService
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
        name: 'activated',
        header: 'Activated',
        path: 'data.enabled',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'userName',
        header: 'Username',
        path: 'data.userName',
        dataType: ColumnDataType.TextShort,
        sortable: true,
        filterable: true
      },
      {
        name: 'email',
        header: 'E-Mail',
        path: 'data.email',
        dataType: ColumnDataType.TextShort,
        sortable: true,
        filterable: true
      },
      {
        name: 'firstName',
        header: 'Firstname',
        path: 'data.firstName',
        dataType: ColumnDataType.TextShort,
        sortable: true,
        filterable: true
      },
      {
        name: 'lastName',
        header: 'Lastname',
        path: 'data.lastName',
        dataType: ColumnDataType.TextShort,
        sortable: true,
        filterable: true
      },
      {
        name: 'tfaEnabled',
        header: 'TFA Enabled',
        path: 'data.twoFactorAuthenticationEnabled',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'lastPasswordChange',
        header: 'Last Password Change',
        path: 'data.lastPasswordChange',
        dataType: ColumnDataType.TextShort,
        sortable: true,
        filterable: false
      },
      {
        header: 'Actions',
        name: 'actions1',
        sortable: false
      }
    ];
  }

  toggleUserActivation(user: TenantSpecificDetails<IUser>): void {
    this.c8yModalService
      .confirm(
        `${user.data.enabled ? 'Disable' : 'Enable'} User: ${user.data.id} (${user.data.lastName || ''}, ${
          user.data.firstName || ''
        })`,
        `Are you sure that you want to ${user.data.enabled ? 'disable' : 'enable'} this User?`,
        user.data.enabled ? 'danger' : 'info'
      )
      .then(
        async () => {
          // modal confirmed
          const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
          const clients = await this.credService.createClients(credentials);
          const client = clients.find((tmpClient) => tmpClient.core.tenant === user.tenantId);
          if (!client) {
            this.alertService.warning('No credentials found.');
          }
          client.user
            .update({
              id: user.data.id,
              enabled: !user.data.enabled
            })
            .then(
              (result) => {
                user.data = result.data;
                this.alertService.success('User Updated.');
              },
              () => {
                this.alertService.danger('Unable to update user.');
              }
            );
        },
        () => {
          // model canceled
        }
      );
  }

  deleteUser(user: TenantSpecificDetails<IUser>): void {
    this.c8yModalService
      .confirm(
        `Delete User: ${user.data.id} (${user.data.lastName || ''}, ${user.data.firstName || ''})`,
        'Are you sure that you want to delete this User?',
        'danger'
      )
      .then(
        async () => {
          // modal confirmed
          const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
          const clients = await this.credService.createClients(credentials);
          const client = clients.find((tmpClient) => tmpClient.core.tenant === user.tenantId);
          if (!client) {
            this.alertService.warning('No credentials found.');
          }
          client.user.delete(user.data.id).then(
            () => {
              this.datasource.clearCache();
              this.refresh.emit();
              this.alertService.success('User removed.');
            },
            () => {
              this.alertService.danger('Unable to remove User.');
            }
          );
        },
        () => {
          // model canceled
        }
      );
  }

  sendPasswordResetMail(user: TenantSpecificDetails<IUser>): void {
    this.c8yModalService
      .confirm(
        `Send Password reset Mail: ${user.data.id} (${user.data.lastName || ''}, ${user.data.firstName || ''})`,
        'Are you sure that you want to send a password reset mail to this User?',
        'warning'
      )
      .then(
        async () => {
          // modal confirmed
          const client = new Client(new BasicAuth());
          client.core
            .fetch(`/user/passwordReset?tenantId=${user.tenantId}`, {
              method: 'POST',
              body: JSON.stringify({ email: user.data.email }),
              headers: {
                'Content-Type': 'application/json'
              }
            } as RequestInit)
            .then((result) => {
              if (result.status !== 200) {
                throw result;
              }
            })
            .then(
              () => {
                this.alertService.success('Sent password reset Mail.');
              },
              () => {
                this.alertService.danger('Unable to sent password reset Mail.');
              }
            );
        },
        () => {
          // model canceled
        }
      );
  }

  async changePassword(user: TenantSpecificDetails<IUser>): Promise<void> {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = await this.credService.createClients(credentials);
    const client = clients.find((tmpClient) => tmpClient.core.tenant === user.tenantId);
    if (!client) {
      this.alertService.warning('No credentials found.');
    }
    this.modalService.show(UserPasswordChangeModalComponent, { initialState: { client, user: user.data } });
  }

  async createNewUser(): Promise<void> {
    const response = new Subject<TenantSpecificDetails<IUser> | null>();
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
    const clients = await this.credService.createClients(credentials);
    this.modalService.show(AddUserModalComponent, {
      initialState: { clients, response },
      ignoreBackdropClick: true
    });
  }
}
