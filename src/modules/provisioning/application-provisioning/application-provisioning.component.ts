import { Component } from '@angular/core';
import { AlertService, AppStateService, Column, ColumnDataType, ModalService } from '@c8y/ngx-components';
import { ApplicationTableDatasourceService } from './application-table-datasource.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { IApplication } from '@c8y/client';
import { Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { TenantSelectionComponent } from '@modules/shared/tenant-selection/tenant-selection.component';
import { ApplicationSubscriptionService } from '@services/application-subscription.service';
import { SubtenantDetailsService } from '@services/subtenant-details.service';

@Component({
  providers: [ApplicationTableDatasourceService],
  selector: 'eos-application-provisioning',
  templateUrl: './application-provisioning.component.html'
})
export class ApplicationProvisioningComponent {
  columns: Column[];
  currentTenantId = '';

  subscriptionOngoing = false;

  constructor(
    public datasource: ApplicationTableDatasourceService,
    private appState: AppStateService,
    private subtenantService: SubtenantDetailsService,
    private c8yModalService: ModalService,
    private modalService: BsModalService,
    private alertService: AlertService,
    private applicationSubService: ApplicationSubscriptionService
  ) {
    this.columns = this.getDefaultColumns();
    this.currentTenantId = this.appState.currentTenant.value.name;
  }

  getDefaultColumns(): Column[] {
    return [
      {
        name: 'id',
        header: 'Id',
        path: 'id',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: true
      },
      {
        name: 'name',
        header: 'Name',
        path: 'name',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: true
      },
      {
        name: 'contextPath',
        header: 'contextPath',
        path: 'contextPath',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: true
      },
      {
        name: 'key',
        header: 'Key',
        path: 'key',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: true
      },
      {
        name: 'availability',
        header: 'Availability',
        path: 'availability',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'type',
        header: 'Type',
        path: 'type',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'owner',
        header: 'Owner',
        path: 'owner.tenant.id',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        header: 'Actions',
        name: 'actions1',
        sortable: false,
        filterable: false
        // visible: false
      }
    ];
  }

  async subscribeApplication(app: IApplication): Promise<void> {
    const tenants = await this.subtenantService.getTenants();
    const tenantIds = tenants.map((tmp) => ({ name: tmp.id }));
    const response = new Subject<{ name: string }[]>();
    response
      .asObservable()
      .pipe(
        take(1),
        filter((tmp) => !!tmp)
      )
      .subscribe(async (res) => {
        const tenantsIds = res.map((tmp) => tmp.name);
        const filteredTenants = tenants.filter((tmp) => tenantsIds.includes(tmp.id));
        if (filteredTenants.length) {
          try {
            await this.c8yModalService.confirm(
              `Subscribing Application(s)`,
              `Are you sure that you want to subscribe the selected Application(s) to all selected ${filteredTenants.length} subtenants?`,
              'warning'
            );
            this.subscriptionOngoing = true;
            this.applicationSubService.subscribeAppToAppAllTenants(app, filteredTenants).then(
              (result) => {
                this.subscriptionOngoing = false;
                const successfullySubscribed = result.filter((tmp) => tmp.status === 201);
                if (successfullySubscribed.length) {
                  this.alertService.success(
                    `Subscribed Application(s) successfully to ${successfullySubscribed.length} subtenants.`
                  );
                }
                const failedToSubscribe = result.filter((tmp) => tmp.status != 201);
                if (failedToSubscribe.length) {
                  this.alertService.warning(
                    `Failed to subscribe Application(s) to ${failedToSubscribe.length} subtenants.`
                  );
                }
                const diffInResponses = filteredTenants.length - result.length;
                if (diffInResponses) {
                  this.alertService.info(
                    `${diffInResponses} subtenants had already been subscribed to the selected Application(s)`
                  );
                }
              },
              (error) => {
                this.subscriptionOngoing = false;
                this.alertService.danger(
                  'Failed to subscribe Application(s) to all selected subtenants.',
                  JSON.stringify(error)
                );
              }
            );
          } catch (e) {}
        } else {
          this.alertService.info('No Tenant selected.');
        }
      });
    this.modalService.show(TenantSelectionComponent, {
      initialState: { response, tenants: tenantIds },
      ignoreBackdropClick: true
    });
  }

  async unsubscribeApplication(app: IApplication): Promise<void> {
    const tenants = await this.subtenantService.getTenants();
    const tenantIds = tenants.map((tmp) => ({ name: tmp.id }));
    const response = new Subject<{ name: string }[]>();
    response
      .asObservable()
      .pipe(
        take(1),
        filter((tmp) => !!tmp)
      )
      .subscribe(async (res) => {
        const tenantsIds = res.map((tmp) => tmp.name);
        const filteredTenants = tenants.filter((tmp) => tenantsIds.includes(tmp.id));
        if (filteredTenants.length) {
          try {
            await this.c8yModalService.confirm(
              `Unsubscribing Application(s)`,
              `Are you sure that you want to unsubscribe the selected Application(s) from all selected ${filteredTenants.length} subtenants?`,
              'warning'
            );
            this.subscriptionOngoing = true;
            this.applicationSubService.unsubscribeAppsFromAllTenants(app, filteredTenants).then(
              (result) => {
                this.subscriptionOngoing = false;
                const successfullySubscribed = result.filter((tmp) => tmp.status === 204);
                if (successfullySubscribed.length) {
                  this.alertService.success(
                    `Unsubscribed Application(s) successfully to ${successfullySubscribed.length} subtenants.`
                  );
                }
                const failedToSubscribe = result.filter((tmp) => tmp.status != 204);
                if (failedToSubscribe.length) {
                  this.alertService.warning(
                    `Failed to unsubscribe Application(s) to ${failedToSubscribe.length} subtenants.`
                  );
                }
                const diffInResponses = filteredTenants.length - result.length;
                if (diffInResponses) {
                  this.alertService.info(
                    `${diffInResponses} subtenants were not subscribed to the selected Application(s)`
                  );
                }
              },
              (error) => {
                this.subscriptionOngoing = false;
                this.alertService.danger(
                  'Failed to unsubscribe Application(s) from all selected subtenants.',
                  JSON.stringify(error)
                );
              }
            );
          } catch (e) {}
        } else {
          this.alertService.info('No Tenant selected.');
        }
      });
    this.modalService.show(TenantSelectionComponent, {
      initialState: { response, tenants: tenantIds },
      ignoreBackdropClick: true
    });
  }
}
