import { Component, Input } from '@angular/core';
import { ITenant, TenantService } from '@c8y/client';

@Component({
  selector: 'ps-tenant-details',
  templateUrl: './tenant-details.component.html'
})
export class TenantDetailsComponent {
  @Input() tenantId: string;
  tenantDetailsPromise: Promise<Partial<ITenant>>;

  constructor(private tenantService: TenantService) {}

  getTenantDetails(tenantId: string): void {
    this.tenantDetailsPromise = this.tenantService.detail(tenantId).then(
      (result) => {
        return result.data;
      },
      () => {
        return {} as Partial<ITenant>;
      }
    );
  }
}
