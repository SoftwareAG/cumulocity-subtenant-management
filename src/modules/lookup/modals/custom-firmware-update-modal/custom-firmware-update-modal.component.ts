import { Component, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'ps-custom-firmware-update-modal',
  templateUrl: './custom-firmware-update-modal.component.html'
})
export class CustomFirmwareUpdateModalComponent {
  @Input() response: Subject<{ name: string; version: string; url: string }>;
  firmware = { name: '', version: '', url: '' };
  constructor(private bsModalRef: BsModalRef) {}

  onDismiss(event: any): void {
    if (this.response) {
      this.response.next(null);
    }
    this.bsModalRef.hide();
  }

  onSave(event: any): void {
    if (this.response) {
      this.response.next(this.firmware);
    }
    this.bsModalRef.hide();
  }
}
