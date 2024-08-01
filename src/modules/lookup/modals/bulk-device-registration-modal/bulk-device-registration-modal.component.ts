import { Component } from '@angular/core';
import { Client, IDeviceRegistrationBulkResult, IDeviceRegistrationCreate } from '@c8y/client';
import { AlertService, PickedFiles } from '@c8y/ngx-components';
import { DeviceRegistrationDetailsService } from '@services/device-registration-details.service';
import { isEmpty } from 'lodash-es';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';
import { saveAs } from 'file-saver';

const fullCsvHeaders: string[] = ['ID', 'CREDENTIALS', 'TYPE', 'NAME'];

@Component({
  selector: 'ps-bulk-device-registration-modal',
  templateUrl: './bulk-device-registration-modal.component.html'
})
export class BulkDeviceRegistrationModalComponent {
  clients: Client[];
  response: Subject<boolean>;
  registration: Partial<IDeviceRegistrationCreate> = {};
  selectedTenant: string;
  selectedClient: Client;
  bulkResponse: IDeviceRegistrationBulkResult;
  file: File;

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
      this.response.next(null);
    }
    this.bsModalRef.hide();
  }

  onFile(dropped: PickedFiles) {
    if (!isEmpty(dropped.url)) {
      this.file = null;
      return;
    } else if (dropped.droppedFiles) {
      this.file = dropped.droppedFiles[0].file;
      return;
    } else {
      this.file = null;
    }
  }

  downloadFull() {
    return this.download(fullCsvHeaders, 'Full bulk registration - template.csv');
  }

  download(headers: string[], fileName: string) {
    const headerRaw = headers.map((header) => `${header}`).join(';');
    const binaryFile = new Blob([headerRaw], { type: 'text/csv' });
    saveAs(binaryFile, fileName);
  }

  onSave(): void {
    this.deviceRegistrationDetailsService.createBulkRegistrationRequest(this.selectedClient, this.file).then(
      (res) => {
        this.bulkResponse = res.data;
      },
      (error) => {
        this.alertService.danger('Failed to create Device Registration.', JSON.stringify(error));
        if (this.response) {
          this.response.next();
        }
      }
    );
  }
}
