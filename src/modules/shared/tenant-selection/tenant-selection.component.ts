import { Component, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-tenant-selection',
  templateUrl: './tenant-selection.component.html'
})
export class TenantSelectionComponent {
  @Input() title = 'Subtenant selection';
  @Input() tenants: { name: string }[] = [];
  @Input() response: Subject<{ name: string }[]>;
  selectedTenants: { name: string }[] = [];
  constructor(private bsModalRef: BsModalRef) {}

  onDismiss(): void {
    if (this.response) {
      this.response.next(null);
    }
    this.bsModalRef.hide();
  }

  onSave(): void {
    if (this.response) {
      this.response.next(this.selectedTenants);
    }
    this.bsModalRef.hide();
  }
}
