import { Component, ViewChild } from '@angular/core';
import {
  AlertService,
  AppStateService,
  BulkActionControl,
  Column,
  ColumnDataType,
  DataGridComponent,
  ModalService
} from '@c8y/ngx-components';
import { ApplicationTableDatasourceService } from './application-table-datasource.service';
import { IApplication, ITenant } from '@c8y/client';
import { ApplicationSubscriptionService } from '@services/application-subscription.service';
import { SubtenantDetailsService } from '@services/subtenant-details.service';
import { flatMap } from 'lodash-es';
import { ApplicationService } from '@c8y/ngx-components/api';
import { TenantSelectionService } from '@modules/shared/tenant-selection/tenant-selection.service';

@Component({
  providers: [ApplicationTableDatasourceService],
  selector: 'eos-application-provisioning',
  templateUrl: './application-provisioning.component.html'
})
export class ApplicationProvisioningComponent {
  @ViewChild(DataGridComponent, { static: true }) dataGrid: DataGridComponent;
  columns: Column[];
  bulkActionControls: BulkActionControl[] = [
    {
      type: 'Subscribe',
      icon: 'refresh',
      text: 'Subscribe',
      callback: (selectedItemIds: string[], reload: () => void): void => {
        this.subscribeMultipleApps(selectedItemIds).then(
          () => {
            this.dataGrid.setAllItemsInCurrentPageSelected(false);
            reload();
          },
          () => {
            reload();
          }
        );
      }
    },
    {
      type: 'Unsubscribe',
      icon: 'trash',
      text: 'Unsubscribe',
      callback: (selectedItemIds: string[], reload: () => void): void => {
        this.unsubscribeMultipleApps(selectedItemIds).then(
          () => {
            this.dataGrid.setAllItemsInCurrentPageSelected(false);
            reload();
          },
          () => {
            reload();
          }
        );
      }
    }
  ];
  currentTenantId = '';

  subscriptionOngoing = false;

  constructor(
    public datasource: ApplicationTableDatasourceService,
    private appState: AppStateService,
    private subtenantService: SubtenantDetailsService,
    private c8yModalService: ModalService,
    private alertService: AlertService,
    private applicationSubService: ApplicationSubscriptionService,
    private applicationService: ApplicationService,
    private tenantSelectionService: TenantSelectionService
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
        name: 'numberOfTenantsHavingTheApp',
        header: 'Tenants having the app',
        path: 'numberOfTenantsHavingTheApp',
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

  private async subscribeMultipleApps(appIds: string[]) {
    const promArray = appIds.map((tmp) => this.applicationService.detail(tmp));
    const apps = await Promise.all(promArray).then((result) => result.map((tmp) => tmp.data));
    await this.subscribeApplications(apps);
  }

  private async unsubscribeMultipleApps(appIds: string[]) {
    const promArray = appIds.map((tmp) => this.applicationService.detail(tmp));
    const apps = await Promise.all(promArray).then((result) => result.map((tmp) => tmp.data));
    await this.unsubscribeApplications(apps);
  }

  async subscribeApplications(apps: IApplication[]): Promise<void> {
    let selectedTenantIds: string[] = [];
    const tenants = await this.subtenantService.getTenants();

    try {
      selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenants);
    } catch (e) {
      return;
    }

    const filteredTenants = tenants.filter((tmp) => selectedTenantIds.includes(tmp.id));
    await this.subscribeAppsToTenants(apps, filteredTenants);
  }

  async unsubscribeApplications(apps: IApplication[]): Promise<void> {
    let selectedTenantIds: string[] = [];
    const tenants = await this.subtenantService.getTenants();

    try {
      selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenants);
    } catch (e) {
      return;
    }

    const filteredTenants = tenants.filter((tmp) => selectedTenantIds.includes(tmp.id));
    await this.unsubscribeAppsToTenants(apps, filteredTenants);
  }

  private async subscribeAppsToTenants(apps: IApplication[], tenants: ITenant[]) {
    try {
      await this.c8yModalService.confirm(
        `Subscribing Application(s)`,
        `Are you sure that you want to subscribe the selected Application(s) to all selected ${tenants.length} subtenants?`,
        'warning'
      );
      this.subscriptionOngoing = true;
      const promArray = apps.map((app) => this.applicationSubService.subscribeAppToAllTenants(app, tenants));
      await Promise.all(promArray).then(
        (result) => {
          const flatResult = flatMap(result);
          this.subscriptionOngoing = false;
          const successfullySubscribed = flatResult.filter((tmp) => tmp.status === 201);
          if (successfullySubscribed.length) {
            this.alertService.success(
              `Subscribed Application(s) successfully to ${successfullySubscribed.length} subtenants.`
            );
          }
          const failedToSubscribe = flatResult.filter((tmp) => tmp.status != 201);
          if (failedToSubscribe.length) {
            this.alertService.warning(`Failed to subscribe Application(s) to ${failedToSubscribe.length} subtenants.`);
          }
          const diffInResponses = tenants.length * apps.length - flatResult.length;
          if (diffInResponses) {
            this.alertService.info(`${diffInResponses} application subscriptions were already in place.`);
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
      this.dataGrid.reload();
    } catch (e) {}
  }

  private async unsubscribeAppsToTenants(apps: IApplication[], tenants: ITenant[]) {
    try {
      await this.c8yModalService.confirm(
        `Unsubscribing Application(s)`,
        `Are you sure that you want to unsubscribe the selected Application(s) from all selected ${tenants.length} subtenants?`,
        'warning'
      );
      this.subscriptionOngoing = true;
      const promArray = apps.map((app) => this.applicationSubService.unsubscribeAppFromAllTenants(app, tenants));
      await Promise.all(promArray).then(
        (result) => {
          const flatResult = flatMap(result);
          this.subscriptionOngoing = false;
          const successfullySubscribed = flatResult.filter((tmp) => tmp.status === 204);
          if (successfullySubscribed.length) {
            this.alertService.success(
              `Unsubscribed Application(s) successfully to ${successfullySubscribed.length} subtenants.`
            );
          }
          const failedToSubscribe = flatResult.filter((tmp) => tmp.status != 204);
          if (failedToSubscribe.length) {
            this.alertService.warning(
              `Failed to unsubscribe Application(s) to ${failedToSubscribe.length} subtenants.`
            );
          }
          const diffInResponses = tenants.length * apps.length - flatResult.length;
          if (diffInResponses) {
            this.alertService.info(`${diffInResponses} application subscriptions have not been there.`);
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
      this.dataGrid.reload();
    } catch (e) {}
  }
}
