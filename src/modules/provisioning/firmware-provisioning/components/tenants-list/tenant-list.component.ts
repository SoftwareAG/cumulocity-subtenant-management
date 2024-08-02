import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { IResultList, ITenant, TenantService, TenantStatus } from "@c8y/client";
import {
  ActionControl,
  Column,
  DisplayOptions,
  Pagination,
  SortOrder,
  gettext,
} from "@c8y/ngx-components";
import { BehaviorSubject, from } from "rxjs";
import { expand, reduce, shareReplay, takeWhile } from "rxjs/operators";
import { CreationTimeFilteringFormRendererComponent } from "../tenant-filters/creation-time.filtering-form-renderer.component";
import { StatusFilteringFormRendererComponent } from "../tenant-filters/status.filtering-form-renderer.component";

@Component({
  selector: "inet-tenant-list",
  templateUrl: "tenant-list.component.html",
})
export class TenantListComponent implements OnInit {
  tenants$: BehaviorSubject<ITenant[]> = new BehaviorSubject(undefined);
  title: string = null;
  loadMoreItemsLabel: string = gettext("Load more tenants");
  loadingItemsLabel: string = gettext("Loading tenants…");
  selectable: boolean = true;
  TenantStatus = TenantStatus;

  displayOptions: DisplayOptions = {
    bordered: false,
    striped: true,
    filter: true,
    gridHeader: true,
  };
  columns: Column[] = this.getColumns();
  pagination: Pagination = this.getPagination();
  showSearch: boolean = true;
  actionControls: ActionControl[] = [];
  selectedTenantIds: string[] = [];

  @Output() onTenantsSelect: EventEmitter<ITenant[]> = new EventEmitter<
    ITenant[]
  >();

  constructor(private tenantService: TenantService) {}

  ngOnInit() {
    this.loadTenants();
  }

  ngOnChanges() {
    this.loadTenants();
  }

  /**
   * loadTenants is used to load all tenants from the platform for provisioning or de-provisioning
   */
  async loadTenants() {
    this.tenants$.next(undefined);
    from(
      this.tenantService.list({
        pageSize: 2000,
        withTotalPages: true,
        withApps: false,
      }),
    )
      .pipe(
        expand(
          (resultList) =>
            resultList.paging.nextPage !== null && resultList.paging.next(),
        ),
        takeWhile((resultList) => resultList.paging.nextPage !== null, true),
        reduce(
          (tenants: ITenant[], resultList: IResultList<ITenant>) => [
            ...tenants,
            ...resultList.data,
          ],
          [],
        ),
        shareReplay(1),
      )
      .subscribe((tenants) => this.tenants$.next(tenants));
  }

  /**
   * onItemsSelect is used to set the selected tenants for provisioning or de-provisioning
   */
  onItemsSelect(selectedItemIds: string[]) {
    let selectedTenants = [];
    this.tenants$.subscribe((tenants) => {
      tenants.forEach((tenant) => {
        if (selectedItemIds.includes(tenant.id)) {
          selectedTenants.push(tenant);
        }
      });
    });
    this.onTenantsSelect.emit(selectedTenants);
  }

  getColumns(): Column[] {
    return [
      {
        name: "company",
        header: gettext("Tenant"),
        path: "company",
        filterable: true,
        sortable: true,
        sortOrder: "asc" as SortOrder,
      },
      {
        name: "id",
        header: gettext("ID"),
        path: "id",
        filterable: true,
        sortable: true,
      },
      {
        name: "domain",
        header: gettext("Domain"),
        path: "domain",
        filterable: true,
        sortable: true,
      },
      {
        name: "contactName",
        header: gettext("Contact name"),
        path: "contactName",
        filterable: true,
        sortable: true,
      },
      {
        name: "creationTime",
        header: gettext("Created"),
        path: "creationTime",
        filterable: true,
        filteringFormRendererComponent:
          CreationTimeFilteringFormRendererComponent,
        sortable: true,
      },
      {
        name: "status",
        header: gettext("Status"),
        path: "status",
        filterable: true,
        filteringFormRendererComponent: StatusFilteringFormRendererComponent,
        sortable: true,
        resizable: false,
      },
    ];
  }

  getPagination(): Pagination {
    return {
      pageSize: 10,
      currentPage: 1,
    };
  }

  isActive(tenant: ITenant) {
    return tenant.status === TenantStatus.ACTIVE;
  }

  isSuspended(tenant: ITenant) {
    return tenant.status === TenantStatus.SUSPENDED;
  }
}
