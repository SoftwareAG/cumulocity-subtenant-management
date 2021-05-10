import { Component, OnInit } from '@angular/core';
import { Client, IManagedObject, IUser, TenantOptionsService } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { camelCase } from 'lodash-es';

@Component({
  selector: 'ps-user-password-change-modal',
  templateUrl: './user-password-change-modal.component.html'
})
export class UserPasswordChangeModalComponent implements OnInit {
  client: Client;
  user: IUser;
  password = '';
  passwordConfirm = '';

  constructor(
    private bsModalRef: BsModalRef,
    private alertService: AlertService,
    private tenantOptions: TenantOptionsService
  ) {}

  ngOnInit() {}

  onDismiss(event: any) {
    this.bsModalRef.hide();
  }

  onSave(event: any) {
    this.client.user
      .update({
        id: this.user.id,
        password: this.password
      })
      .then(
        (result) => {
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
