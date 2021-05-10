import { Component, OnInit } from '@angular/core';
import { Client, IManagedObject } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'ps-firmware-update-modal',
  templateUrl: './firmware-update-modal.component.html'
})
export class FirmwareUpdateModalComponent implements OnInit {
  legacyFirmwareUpdates: (IManagedObject & {name?: string, url?: string, version?: string})[];
  selectedFirmware: (IManagedObject & {name?: string, url?: string, version?: string});
  client: Client;
  deviceDetails: TenantSpecificDetails<Partial<IManagedObject>>;
  isLoading = true;

  constructor(
    private bsModalRef: BsModalRef,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    if (this.client) {
      this.isLoading = true;
      const filter = {
        query: `type eq 'c8y_Firmware' and has(url) and has(version)`,
        pageSize: 1000
      };
      this.client.inventory.list(filter).then(result => {
        this.legacyFirmwareUpdates = result.data;
        this.isLoading = false;
      }, error => {
        this.legacyFirmwareUpdates = [];
        this.isLoading = false;
      });
    } else {
      this.alertService.warning('No Credentials');
    }
  }

  onDismiss(event: any) {
    this.bsModalRef.hide();
  }

  onSave(event: any) {
    if (this.selectedFirmware) {
      this.client.operation.create({
        deviceId: this.deviceDetails.data.id,
        c8y_Firmware: {
          name: this.selectedFirmware.name,
          version: this.selectedFirmware.version,
          url: this.selectedFirmware.url
        }
      }).then(result => {
        this.alertService.success('Firmware Update created.');
        this.bsModalRef.hide();
      }, error => {
        this.alertService.danger('Failed to create Firmware Update.');
        this.bsModalRef.hide();
      });
    } else {
      this.bsModalRef.hide();
    }
  }

}
