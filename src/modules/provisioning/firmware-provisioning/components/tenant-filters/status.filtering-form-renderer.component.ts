import { Component } from "@angular/core";
import { ITenant, TenantStatus } from "@c8y/client";
import { FilteringFormRendererContext } from "@c8y/ngx-components";

@Component({
  templateUrl: "./status.filtering-form-renderer.component.html",
})
export class StatusFilteringFormRendererComponent {
  model: {
    active: boolean;
    suspended: boolean;
  };

  constructor(public context: FilteringFormRendererContext) {
    this.model = (this.context.property.externalFilterQuery || {}).model || {};
  }

  applyFilter() {
    this.context.applyFilter({
      externalFilterQuery: {
        model: this.model,
      },
      filterPredicate: (tenant: ITenant) =>
        Boolean(
          (!this.model.active && !this.model.suspended) ||
            (this.model.active && tenant.status === TenantStatus.ACTIVE) ||
            (this.model.suspended && tenant.status === TenantStatus.SUSPENDED),
        ),
    });
  }

  resetFilter() {
    this.context.resetFilter();
  }
}
