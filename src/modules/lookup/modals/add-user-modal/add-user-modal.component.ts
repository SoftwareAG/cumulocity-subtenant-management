import { Component } from '@angular/core';
import { Client, IUser, IUserGroup } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

@Component({
  selector: 'ps-add-user-modal',
  templateUrl: './add-user-modal.component.html'
})
export class AddUserModalComponent {
  clients: Client[];
  response: Subject<TenantSpecificDetails<IUser> | null>;
  user: Partial<IUser & { [key: string]: unknown }> = {
    sendPasswordResetEmail: false,
    twoFactorAuthenticationEnabled: false,
    enabled: true
  };
  selectedTenant: string;
  selectedClient: Client;
  availableGroups: IUserGroup[] = [];
  selectedGroups: IUserGroup[] = [];

  constructor(private bsModalRef: BsModalRef, private alertService: AlertService) {}

  onTenantSelect(): void {
    if (!this.selectedClient || this.selectedTenant !== this.selectedClient.core.tenant) {
      this.selectedClient = this.clients.find((tmp) => tmp.core.tenant === this.selectedTenant);
      this.availableGroups = [];
      this.selectedGroups = [];
      if (this.selectedClient) {
        this.selectedClient.userGroup.list().then(
          (result) => {
            this.availableGroups = result.data;
          },
          () => {
            this.alertService.danger('Failed to load User-Groups');
          }
        );
      }
    }
  }

  onDismiss(): void {
    if (this.response) {
      this.response.next(null);
    }
    this.bsModalRef.hide();
  }

  onSave(): void {
    console.log(this.selectedGroups);
    this.selectedClient.user.create(this.user as IUser).then(
      (result) => {
        const createdUser = result.data;
        Promise.all(
          this.selectedGroups.map((tmp) => {
            return this.selectedClient.userGroup.addUserToGroup(tmp.id, createdUser.self);
          })
        ).then(
          () => {
            this.alertService.success('User Created');
            if (this.response) {
              this.response.next({ data: createdUser, tenantId: this.selectedClient.core.tenant });
            }
            this.bsModalRef.hide();
          },
          () => {
            this.alertService.danger('Failed to add user to some groups. User has been created.');
            if (this.response) {
              this.response.next({ data: createdUser, tenantId: this.selectedClient.core.tenant });
            }
            this.bsModalRef.hide();
          }
        );
      },
      (error) => {
        if (error && error.data && error.data.message) {
          this.alertService.danger('Failed to create User.', error.data.message);
        } else {
          this.alertService.danger('Failed to create User.');
        }
        if (this.response) {
          this.response.next(null);
        }

        this.bsModalRef.hide();
      }
    );
  }
}
