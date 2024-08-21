import { Component } from '@angular/core';
import { Client, IUser, TenantOptionsService } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'ps-user-password-change-modal',
  templateUrl: './user-password-change-modal.component.html'
})
export class UserPasswordChangeModalComponent {
  client: Client;
  user: IUser;
  password = '';
  passwordConfirm = '';

  constructor(
    private bsModalRef: BsModalRef,
    private alertService: AlertService,
    private tenantOptions: TenantOptionsService
  ) {}

  onDismiss(): void {
    this.bsModalRef.hide();
  }

  onSave(): void {
    this.client.user
      .update({
        id: this.user.id,
        password: this.password
      })
      .then(
        () => {
          this.alertService.success('Password changed');
          this.bsModalRef.hide();
        },
        (error) => {
          if (error && error.data && error.data.message) {
            this.alertService.danger('Failed to change Password.', error.data.message);
          } else {
            this.alertService.danger('Failed to change Password.');
          }

          this.bsModalRef.hide();
        }
      );
  }
}
