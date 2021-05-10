import { Component, Input, OnInit } from '@angular/core';
import { ITenant, TenantService } from '@c8y/client';

@Component({
  selector: 'ps-tenant-details',
  templateUrl: './tenant-details.component.html'
})
export class TenantDetailsComponent implements OnInit {
  @Input() tenantId: string;
  tenantDetailsPromise: Promise<Partial<ITenant>>;

  constructor(private tenantService: TenantService) {}

  ngOnInit() {}

  getTenantDetails(tenantId: string) {
    this.tenantDetailsPromise = this.tenantService.detail(tenantId).then(
      (result) => {
        return result.data;
      },
      (error) => {
        return {} as Partial<ITenant>;
      }
    );
  }
}
