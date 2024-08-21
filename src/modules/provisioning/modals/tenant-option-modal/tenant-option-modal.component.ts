import { Component, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { ITenantOption } from '@c8y/client';

@Component({
  selector: 'ps-tenant-option-modal',
  templateUrl: './tenant-option-modal.component.html'
})
export class TenantOptionModalComponent {
  @Input() response: Subject<ITenantOption>;
  @Input() tenantOption: ITenantOption = { category: '', key: '', value: '' };
  constructor(private bsModalRef: BsModalRef) {}

  onDismiss(event: any): void {
    if (this.response) {
      this.response.next(null);
    }
    this.bsModalRef.hide();
  }

  onSave(event: any): void {
    if (this.response) {
      this.response.next(this.tenantOption);
    }
    this.bsModalRef.hide();
  }
}
