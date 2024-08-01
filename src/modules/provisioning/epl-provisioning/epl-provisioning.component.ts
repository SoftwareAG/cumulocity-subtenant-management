import { Component, OnInit, ViewChild } from '@angular/core';
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
import { EplService } from './epl.service';
import { flatMap } from 'lodash-es';
import { EplRule } from '@models/EplRule';
import { Client, ICurrentTenant, TenantService } from '@c8y/client';
import { TenantSelectionService } from '@modules/shared/tenant-selection/tenant-selection.service';
import { SubtenantDetailsService } from '@services/subtenant-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Component({
  providers: [EplService],
  selector: 'ps-epl-provisioning',
  templateUrl: './epl-provisioning.component.html'
})
export class EplProvisioningComponent implements OnInit {
  @ViewChild(DataGridComponent, { static: true }) dataGrid: DataGridComponent;
  columns: Column[];

  currentTenantId: string;
  tenant: ICurrentTenant;

  bulkActionControls: BulkActionControl[] = [];

  subscriptionOngoing = false;

  pagination: Pagination = {
    currentPage: 1,
    pageSize: 50
  };

  actions: ActionControl[] = [];

  rows: EplRule[] = [];

  constructor(
    private eplService: EplService,
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
    this.eplService.getEplFiles().then((res) => {
      this.rows = res.eplfiles;
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

  async deployEplRule(rules: EplRule[]): Promise<void> {
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
        `Deploy EPL rule(s)`,
        `Are you sure that you want to deploy the selected EPL rule(s) to all selected ${clients.length} subtenants?`,
        'warning'
      );
      await this.deployEplRuleToTenants(rules, clients);
    } catch (e) {}
  }

  private async deployEplRuleToTenants(rules: EplRule[], clients: Client[]) {
    this.subscriptionOngoing = true;
    const promArray = rules.map((rule) => this.eplService.deployToAllTenants(rule, clients));
    await Promise.all(promArray).then(
      (result) => {
        const flatResult = flatMap(result);
        this.subscriptionOngoing = false;
        const successfullySubscribed = flatResult.filter((tmp) => tmp.status === 201);
        if (successfullySubscribed.length) {
          this.alertService.success(
            `Deployment of rule(s) successfully to ${successfullySubscribed.length} subtenants.`
          );
        }
        const failedToSubscribe = flatResult.filter((tmp) => tmp.status != 201);
        if (failedToSubscribe.length) {
          this.alertService.warning(`Failed to deploy rule(s) to ${failedToSubscribe.length} subtenants.`);
        }
        const diffInResponses = clients.length * rules.length - flatResult.length;
        if (diffInResponses) {
          this.alertService.info(`${diffInResponses} epl rule(s) were already deployed.`);
        }
      },
      (error) => {
        this.subscriptionOngoing = false;
        this.alertService.danger('Failed to deploy rules(s) to all selected subtenants.', JSON.stringify(error));
      }
    );
    this.dataGrid.reload();
  }

  async removeEplRule(rules: EplRule[]): Promise<void> {
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
        `Remove EPL rule(s)`,
        `Are you sure that you want to remove the selected EPL rule(s) from all selected ${clients.length} subtenants?`,
        'warning'
      );
      await this.removeEplRuleToTenants(rules, clients);
    } catch (e) {}
  }

  private async removeEplRuleToTenants(rules: EplRule[], clients: Client[]) {
    this.subscriptionOngoing = true;
    const promArray = rules.map((rule) => this.eplService.removeFromAllTenants(rule, clients));
    await Promise.all(promArray).then(
      (result) => {
        const flatResult = flatMap(result);
        this.subscriptionOngoing = false;
        const successfullySubscribed = flatResult.filter((tmp) => tmp.status === 200);
        if (successfullySubscribed.length) {
          this.alertService.success(
            `Deletion of rule(s) successfully from ${successfullySubscribed.length} subtenants.`
          );
        }
        const failedToSubscribe = flatResult.filter((tmp) => tmp.status != 200);
        if (failedToSubscribe.length) {
          this.alertService.warning(`Failed to remove rule(s) from ${failedToSubscribe.length} subtenants.`);
        }
        const diffInResponses = clients.length * rules.length - flatResult.length;
        if (diffInResponses) {
          this.alertService.info(`${diffInResponses} epl rules were already removed.`);
        }
      },
      (error) => {
        this.subscriptionOngoing = false;
        this.alertService.danger('Failed to deploy rules(s) to all selected subtenants.', JSON.stringify(error));
      }
    );
    this.dataGrid.reload();
  }
}
