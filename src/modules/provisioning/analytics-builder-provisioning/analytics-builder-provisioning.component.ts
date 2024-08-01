import { Component, OnInit, ViewChild } from '@angular/core';
import { AnalyticsBuilderService } from './analytics-builder.service';
import {
  ActionControl,
  AlertService,
  BulkActionControl,
  Column,
  ColumnDataType,
  DataGridComponent,
  ModalService,
  Pagination
} from '@c8y/ngx-components';
import { AnalyticsBuilderModel } from '@models/analytics-builder-model';
import { Client, ICurrentTenant, TenantService } from '@c8y/client';
import { TenantSelectionService } from '@modules/shared/tenant-selection/tenant-selection.service';
import { SubtenantDetailsService } from '@services/subtenant-details.service';
import { flatMap } from 'lodash-es';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Component({
  providers: [AnalyticsBuilderService],
  selector: 'ps-analytics-builder-provisioning',
  templateUrl: './analytics-builder-provisioning.component.html'
})
export class AnalyticsBuilderProvisioningComponent implements OnInit {
  @ViewChild(DataGridComponent, { static: true }) dataGrid: DataGridComponent;
  columns: Column[];

  tenant: ICurrentTenant;
  bulkActionControls: BulkActionControl[] = [];

  subscriptionOngoing = false;

  pagination: Pagination = {
    currentPage: 1,
    pageSize: 50
  };

  actions: ActionControl[] = [];

  rows: AnalyticsBuilderModel[] = [];

  constructor(
    private analyticsBuilderService: AnalyticsBuilderService,
    private tenantService: TenantService,
    private tenantSelectionService: TenantSelectionService,
    private subtenantService: SubtenantDetailsService,
    private c8yModalService: ModalService,
    private alertService: AlertService,
    private credService: FakeMicroserviceService
  ) {
    this.columns = this.getDefaultColumns();
  }

  ngOnInit(): void {
    this.tenantService.current().then((tenant) => {
      this.tenant = tenant.data;
    });
    this.analyticsBuilderService.fetchAnalyticsBuilder().then((res) => {
      this.rows = res.analyticsBuilderModelRepresentations;
    });
  }

  getDefaultColumns(): Column[] {
    return [
      {
        name: 'id',
        header: 'Id',
        path: 'id',
        dataType: ColumnDataType.Numeric,
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
        name: 'description',
        header: 'Description',
        path: 'description',
        dataType: ColumnDataType.TextLong,
        sortable: false,
        filterable: false,
        visible: true
      },
      {
        name: 'state',
        header: 'State',
        path: 'state',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: true
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

  async createAnalyticsBuilderModel(models: AnalyticsBuilderModel[]): Promise<void> {
    let selectedTenantIds: string[] = [];
    const tenants = await this.subtenantService.getTenants();
    try {
      selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenants);
    } catch (e) {
      return;
    }
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const filteredCredentials = credentials.filter((cred) => selectedTenantIds.includes(cred.tenant));
    const clients = await this.credService.createClients(filteredCredentials);
    try {
      await this.c8yModalService.confirm(
        `Deploy Analytics Builder Model(s) `,
        `Are you sure that you want to deploy the selected Analytics Builder Models to all selected ${clients.length} subtenants?`,
        'warning'
      );
      await this.createAnalyticsBuilderModelsToTenants(models, clients);
    } catch (e) {}
  }

  private async createAnalyticsBuilderModelsToTenants(models: AnalyticsBuilderModel[], clients: Client[]) {
    this.subscriptionOngoing = true;
    const promArray = models.map((model) => this.analyticsBuilderService.createModelAtAllTenants(model, clients));
    await Promise.all(promArray).then(
      (result) => {
        const flatResult = flatMap(result);
        this.subscriptionOngoing = false;
        const successfullySubscribed = flatResult.filter((tmp) => tmp.status === 201);
        if (successfullySubscribed.length) {
          this.alertService.success(
            `Deployment of model(s) successfully to ${successfullySubscribed.length} subtenants.`
          );
        }
        const failedToSubscribe = flatResult.filter((tmp) => tmp.status != 201);
        if (failedToSubscribe.length) {
          this.alertService.warning(`Failed to deploy model(s) to ${failedToSubscribe.length} subtenants.`);
        }
        const diffInResponses = clients.length * models.length - flatResult.length;
        if (diffInResponses) {
          this.alertService.info(`${diffInResponses} Analytic Builder Model(s) were already deployed.`);
        }
      },
      (error) => {
        this.subscriptionOngoing = false;
        this.alertService.danger('Failed to deploy model(s) to all selected subtenants.', JSON.stringify(error));
      }
    );
    this.dataGrid.reload();
  }

  async removeAnalyticsBuilderModels(models: AnalyticsBuilderModel[]): Promise<void> {
    let selectedTenantIds: string[] = [];
    const tenants = await this.subtenantService.getTenants();
    try {
      selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenants);
    } catch (e) {
      return;
    }
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const filteredCredentials = credentials.filter((cred) => selectedTenantIds.includes(cred.tenant));
    const clients = await this.credService.createClients(filteredCredentials);
    try {
      await this.c8yModalService.confirm(
        `Remove Analytics Builder Model(s)`,
        `Are you sure that you want to remove the selected Analytics Builder Model(s) from all selected ${clients.length} subtenants?`,
        'warning'
      );
      await this.removeAnalyticsBuilderModelsFromTenants(models, clients);
    } catch (e) {}
  }

  private async removeAnalyticsBuilderModelsFromTenants(models: AnalyticsBuilderModel[], clients: Client[]) {
    this.subscriptionOngoing = true;
    const promArray = models.map((model) => this.analyticsBuilderService.removeFromAllTenants(model, clients));
    await Promise.all(promArray).then(
      (result) => {
        const flatResult = flatMap(result);
        this.subscriptionOngoing = false;
        const successfullySubscribed = flatResult.filter((tmp) => tmp.status === 204);
        if (successfullySubscribed.length) {
          this.alertService.success(
            `Deletion of model(s) successfully from ${successfullySubscribed.length} subtenants.`
          );
        }
        const failedToSubscribe = flatResult.filter((tmp) => tmp.status != 204);
        if (failedToSubscribe.length) {
          this.alertService.warning(`Failed to remove model(s) from ${failedToSubscribe.length} subtenants.`);
        }
        const diffInResponses = clients.length * models.length - flatResult.length;
        if (diffInResponses) {
          this.alertService.info(`${diffInResponses} Analytic Builder Model(s) were already removed.`);
        }
      },
      (error) => {
        this.subscriptionOngoing = false;
        this.alertService.danger('Failed to deploy model(s) to all selected subtenants.', JSON.stringify(error));
      }
    );
    this.dataGrid.reload();
  }
}
