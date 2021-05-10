import { Component, OnInit } from '@angular/core';
import { Client, IManagedObject } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'ps-configuration-update-modal',
  templateUrl: './configuration-update-modal.component.html'
})
export class ConfigurationUpdateModalComponent implements OnInit {
  client: Client;
  deviceDetails: TenantSpecificDetails<Partial<IManagedObject>>;
  isLoading = true;
  config = '';

  constructor(private bsModalRef: BsModalRef, private alertService: AlertService) {}

  ngOnInit() {
    if (this.deviceDetails && this.deviceDetails.data.c8y_Configuration) {
      this.config = this.deviceDetails.data.c8y_Configuration.config;
    }
  }

  onDismiss(event: any) {
    this.bsModalRef.hide();
  }

  onSave(event: any) {
    if (this.client && this.deviceDetails) {
      this.client.operation
        .create({
          deviceId: this.deviceDetails.data.id,
          c8y_Configuration: {
            config: this.config
          }
        })
        .then(
          (result) => {
            this.alertService.success('Configuration Update created.');
            this.bsModalRef.hide();
          },
          (error) => {
            this.alertService.danger('Failed to create Configuration Update.');
            this.bsModalRef.hide();
          }
        );
    } else {
      this.bsModalRef.hide();
    }
  }
}
