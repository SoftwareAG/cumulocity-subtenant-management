import { Component, Input } from '@angular/core';
import { ITenant } from '@c8y/client';
import { SubtenantDetailsService } from '@services/subtenant-details.service';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';
import { cloneDeep } from 'lodash-es';
import { OnInit } from '@angular/core';

@Component({
  selector: 'ps-tenant-selection',
  templateUrl: './tenant-selection.component.html'
})
export class TenantSelectionComponent implements OnInit {
  @Input() title = 'Subtenant selection';
  @Input() label = 'Tenants';
  @Input() tenantsIds: string[];
  @Input() response: Subject<string[]>;
  selectedTenants: ITenant[] = [];
  loading = true;
  tenantDetails: ITenant[];
  allSelected = false;
  searchString = '';

  constructor(private bsModalRef: BsModalRef, private tenantService: SubtenantDetailsService) {
    this.tenantService
      .getCachedTenants()
      .then((result) => (this.tenantDetails = cloneDeep(result)))
      .finally(() => {
        this.inputAndTenantDetailsReady();
        this.loading = false;
      });
  }

  ngOnInit(): void {
    this.inputAndTenantDetailsReady();
  }

  inputAndTenantDetailsReady(): void {
    if (this.tenantsIds && this.tenantDetails && this.tenantsIds.length && this.tenantDetails.length) {
      this.tenantDetails = this.tenantDetails.filter((tenant) => this.tenantsIds.includes(tenant.id));
    }
  }

  onDismiss(): void {
    if (this.response) {
      this.response.next(null);
    }
    this.bsModalRef.hide();
  }

  onCheckboxToggle(): void {
    this.selectedTenants = this.tenantDetails.filter((tmp: any) => tmp.selected);
    if (this.selectedTenants.length === this.tenantDetails.length) {
      this.allSelected = true;
    } else {
      this.allSelected = false;
    }
  }

  onAllCheckboxToggle(): void {
    this.tenantDetails.forEach((tmp: any) => (tmp.selected = this.allSelected));
    this.onCheckboxToggle();
  }

  onSave(): void {
    if (this.response) {
      const tenantIds = this.selectedTenants.map((tmp) => tmp.id);
      this.response.next(tenantIds);
    }
    this.bsModalRef.hide();
  }
}
