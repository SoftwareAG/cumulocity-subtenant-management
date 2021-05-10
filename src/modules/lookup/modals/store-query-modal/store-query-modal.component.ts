import { Component } from '@angular/core';
import { TenantOptionsService } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { camelCase } from 'lodash-es';

@Component({
  selector: 'ps-store-query-modal',
  templateUrl: './store-query-modal.component.html'
})
export class StoreQueryModalComponent {
  queryType = 'inventory';
  query = '';
  queryName = '';

  constructor(
    private bsModalRef: BsModalRef,
    private alertService: AlertService,
    private tenantOptions: TenantOptionsService
  ) {}

  onDismiss(): void {
    this.bsModalRef.hide();
  }

  onSave(): void {
    this.tenantOptions
      .update({
        category: FakeMicroserviceService.appName,
        key: `${this.queryType}_${camelCase(this.queryName)}`,
        value: this.query
      })
      .then(
        () => {
          this.alertService.success('Query stored');
          this.bsModalRef.hide();
        },
        () => {
          this.alertService.danger('Failed to store query.');
          this.bsModalRef.hide();
        }
      );
  }
}
