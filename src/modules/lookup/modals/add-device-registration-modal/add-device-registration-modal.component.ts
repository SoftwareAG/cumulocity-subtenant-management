import { Component } from '@angular/core';
import { Client, IDeviceRegistrationCreate } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { DeviceRegistrationDetailsService } from '@services/device-registration-details.service';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

@Component({
  selector: 'ps-add-device-registration-modal',
  templateUrl: './add-device-registration-modal.component.html'
})
export class AddDeviceRegistrationModalComponent {
  clients: Client[] = [];
  response: Subject<boolean> | undefined;
  registration: Partial<IDeviceRegistrationCreate> = {};
  selectedTenant: string | undefined;
  selectedClient: Client | undefined;

  autoAccept = false;

  constructor(
    private bsModalRef: BsModalRef,
    private alertService: AlertService,
    private deviceRegistrationDetailsService: DeviceRegistrationDetailsService
  ) {}

  onTenantSelect(): void {
    if (!this.selectedClient || this.selectedTenant !== this.selectedClient.core.tenant) {
      this.selectedClient = this.clients.find((tmp) => tmp.core.tenant === this.selectedTenant);
    }
  }

  onDismiss(): void {
    if (this.response) {
      this.response.next(false);
    }
    this.bsModalRef.hide();
  }

  onSave(): void {
    this.deviceRegistrationDetailsService
      .createRegistrationRequest(this.selectedClient as Client, this.registration as IDeviceRegistrationCreate, this.autoAccept)
      .then(
        () => {
          this.alertService.success('Device Registration Created.');
          if (this.response) {
            this.response.next(true);
          }
          this.bsModalRef.hide();
        },
        (error) => {
          this.alertService.danger('Failed to create Device Registration.', JSON.stringify(error));
          if (this.response) {
            this.response.error('Failed to create Device Registration.');
          }
          this.bsModalRef.hide();
        }
      );
  }
}
