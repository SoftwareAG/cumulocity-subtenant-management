import { Component, OnInit } from '@angular/core';
import { Client, IManagedObject, TenantOptionsService } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { camelCase } from 'lodash-es';

@Component({
  selector: 'ps-store-query-modal',
  templateUrl: './store-query-modal.component.html'
})
export class StoreQueryModalComponent implements OnInit {
  queryType = 'inventory';
  query = '';
  queryName = '';

  constructor(
    private bsModalRef: BsModalRef,
    private alertService: AlertService,
    private tenantOptions: TenantOptionsService
  ) {}

  ngOnInit() {}

  onDismiss(event: any) {
    this.bsModalRef.hide();
  }

  onSave(event: any) {
    this.tenantOptions
      .update({
        category: FakeMicroserviceService.appName,
        key: `${this.queryType}_${camelCase(this.queryName)}`,
        value: this.query
      })
      .then(
        (result) => {
          this.alertService.success('Query stored');
          this.bsModalRef.hide();
        },
        (error) => {
          this.alertService.danger('Failed to store query.');
          this.bsModalRef.hide();
        }
      );
  }
}
