import { Component, Input } from '@angular/core';
import { ITenant } from '@c8y/client';
import { SubtenantDetailsService } from '@services/subtenant-details.service';

@Component({
  selector: 'ps-tenant-details',
  templateUrl: './tenant-details.component.html'
})
export class TenantDetailsComponent {
  @Input() set tenantId(value: string) {
    this._tenantId = value;
    if (value) {
      this.getTenantDetails(value).then((result) => {
        this.tenantDomain = result.domain;
      });
    }
  }

  get tenantId(): string {
    return this._tenantId;
  }
  private _tenantId: string;
  tenantDomain: string;
  tenantDetailsPromise: Promise<Partial<ITenant>>;

  constructor(private subtenantService: SubtenantDetailsService) {}

  getTenantDetails(tenantId: string): Promise<Partial<ITenant>> {
    return (this.tenantDetailsPromise = this.subtenantService.getDetailsOfTenant(tenantId).then(
      (result) => {
        return result;
      },
      () => {
        return {} as Partial<ITenant>;
      }
    ));
  }
}
