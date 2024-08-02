import { Input } from '@angular/core';
import { Component } from '@angular/core';
import { IRole, IUserGroup } from '@c8y/client';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'ps-role-having-permissions-modal',
  templateUrl: './role-having-permissions-modal.component.html'
})
export class RoleHavingPermissionsModalComponent {
  @Input() permissions: IRole[] = [];
  @Input() role: IUserGroup;

  constructor(private bsModalRef: BsModalRef) { }

  onDismiss(event: any): void {
    this.bsModalRef.hide();
  }
}
