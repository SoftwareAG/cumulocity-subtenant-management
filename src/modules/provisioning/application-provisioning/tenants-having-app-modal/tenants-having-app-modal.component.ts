import { Input } from '@angular/core';
import { Component } from '@angular/core';
import { IApplication, ITenant } from '@c8y/client';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

@Component({
  selector: 'ps-tenants-having-app-modal',
  templateUrl: './tenants-having-app-modal.component.html'
})
export class TenantsHavingAppModalComponent {
  @Input() subscribedTenants: ITenant[] = [];
  @Input() subscribedApp: IApplication;
  @Input() response: Subject<ITenant[]>;
  selectedTenants: ITenant[] = [];

  constructor(private bsModalRef: BsModalRef) {}

  onDismiss(event: any): void {
    if (this.response) {
      this.response.next([]);
    }
    this.bsModalRef.hide();
  }

  onUnsubscribe(event: any): void {
    if (this.response) {
      this.response.next(this.selectedTenants);
    }
    this.bsModalRef.hide();
  }

  onCheckboxToggle(): void {
    this.selectedTenants = this.subscribedTenants.filter((tmp: any) => tmp.unsubscribeApp);
  }
}
