import { Component, OnInit } from '@angular/core';
import { Client, ITenant, IUser, TenantService } from '@c8y/client';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { UserDetailsService } from '@services/user-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { AlertService, ModalService } from '@c8y/ngx-components';
import { UserPasswordChangeModalComponent } from '../modals/user-password-change-modal/user-password-change-modal.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { AddUserModalComponent } from '../modals/add-user-modal/add-user-modal.component';
import { Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'ps-user-lookup',
  templateUrl: './user-lookup.component.html'
})
export class UserLookupComponent implements OnInit {
  usernameSearchString = '';
  emailSearchString = '';
  isLoading = false;
  users: TenantSpecificDetails<IUser>[] = [];
  clients: Client[];

  constructor(
    private credService: FakeMicroserviceService,
    private userDetailsService: UserDetailsService,
    private c8yModalService: ModalService,
    private alertService: AlertService,
    private modalService: BsModalService,
  ) { }

  ngOnInit() {
  }

  lookup() {
    this.isLoading = true;
    this.credService.prepareCachedDummyMicroserviceForAllSubtenants().then(async (creds) => {
      this.clients = this.credService.createClients(creds);
      const users = 
        await this.userDetailsService.searchForUsersMatchingFilterInTennats(this.clients, this.usernameSearchString, this.emailSearchString);
      this.users = users;
      this.isLoading = false;
    });
  }

  toggleUserActivation(user: TenantSpecificDetails<IUser>) {
    this.c8yModalService.confirm(
      `${user.data.enabled ? 'Disable' : 'Enable'} User: ${user.data.id} (${user.data.lastName || ''}, ${user.data.firstName || ''})`,
      `Are you sure that you want to ${user.data.enabled ? 'disable' : 'enable'} this User?`, user.data.enabled ? 'danger' : 'info'
    ).then((res) => {
      // modal confirmed
      const client = this.clients.find(tmpClient => tmpClient.core.tenant === user.tenantId);
      if (!client) {
        this.alertService.warning('No credentials found.');
      }
      client.user.update({
        id: user.data.id,
        enabled: !user.data.enabled
      }).then(result => {
        user.data = result.data;
        this.alertService.success('User Updated.');
      }, error => {
        this.alertService.danger('Unable to update user.');
      });
    }, error => {
      // model canceled
    });
  }

  deleteUser(user: TenantSpecificDetails<IUser>) {
    this.c8yModalService.confirm(
      `Delete User: ${user.data.id} (${user.data.lastName || ''}, ${user.data.firstName || ''})`,
      'Are you sure that you want to delete this User?', 'danger'
    ).then((res) => {
      // modal confirmed
      const client = this.clients.find(tmpClient => tmpClient.core.tenant === user.tenantId);
      if (!client) {
        this.alertService.warning('No credentials found.');
      }
      client.user.delete(user.data.id).then(result => {
        const index = this.users.findIndex(tmp => tmp.tenantId === user.tenantId && tmp.data.id === user.data.id);
        if (index >= 0) {
          this.users.splice(index, 1);
        }
        this.alertService.success('User removed.');
      }, error => {
        this.alertService.danger('Unable to remove User.');
      });
    }, error => {
      // model canceled
    });
  }

  changePassword(user: TenantSpecificDetails<IUser>) {
    const client = this.clients.find(tmpClient => tmpClient.core.tenant === user.tenantId);
    if (!client) {
      this.alertService.warning('No credentials found.');
    }
    this.modalService.show(UserPasswordChangeModalComponent, {initialState: {client, user: user.data}});
  }

  createNewUser() {
    const response = new Subject<TenantSpecificDetails<IUser> | null>();
    response.asObservable().pipe(take(1), filter(tmp => !!tmp)).subscribe((res) => {
      this.users.push(res);
    });
    this.modalService.show(AddUserModalComponent, {initialState: {clients: this.clients, response}, ignoreBackdropClick: true});
  }

}
