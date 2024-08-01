import { Input } from '@angular/core';
import { Component } from '@angular/core';
import { IApplication, IUserGroup } from '@c8y/client';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'ps-role-having-app-modal',
  templateUrl: './role-having-app-modal.component.html'
})
export class RoleHavingAppModalComponent {
  @Input() apps: IApplication[] = [];
  @Input() role: IUserGroup;

  constructor(private bsModalRef: BsModalRef) { }

  onDismiss(event: any): void {
    this.bsModalRef.hide();
  }
}
