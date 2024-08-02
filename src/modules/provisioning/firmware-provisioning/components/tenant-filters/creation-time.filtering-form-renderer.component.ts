import { Component } from "@angular/core";
import { ITenant } from "@c8y/client";
import { FilteringFormRendererContext } from "@c8y/ngx-components";

@Component({
  templateUrl: "./creation-time.filtering-form-renderer.component.html",
})
export class CreationTimeFilteringFormRendererComponent {
  model: {
    dateFrom: Date;
    dateTo: Date;
  };

  constructor(public context: FilteringFormRendererContext) {
    this.model = (this.context.property.externalFilterQuery || {}).model || {};
  }

  applyFilter() {
    this.context.applyFilter({
      externalFilterQuery: {
        model: this.model,
      },
      filterPredicate: (tenant: ITenant) => {
        const creationTime = new Date(tenant.creationTime);
        let dateFrom;
        let dateTo;

        if (this.model.dateFrom) {
          dateFrom = this.model.dateFrom;
          dateFrom.setHours(0, 0, 0, 0);
        }

        if (this.model.dateTo) {
          dateTo = this.model.dateTo;
          dateTo.setHours(23, 59, 59, 999);
        }

        return Boolean(
          (!dateFrom && !dateTo) ||
            (dateFrom && !dateTo && dateFrom <= creationTime) ||
            (!dateFrom && dateTo && creationTime <= dateTo) ||
            (dateFrom &&
              dateTo &&
              dateFrom <= creationTime &&
              creationTime <= dateTo),
        );
      },
    });
  }

  resetFilter() {
    this.context.resetFilter();
  }
}
