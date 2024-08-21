import { Component, OnInit } from '@angular/core';
import { Client } from '@c8y/client';
import { IAlarmMappingBuffer } from '@models/AlarmMappingBuffer';
import { AlarmMapperService } from '@services/alarm-mapper.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { AlertService } from '@c8y/ngx-components';
import { TenantSelectionService } from '@modules/shared/tenant-selection/tenant-selection.service';

@Component({
  providers: [AlarmMapperService],
  selector: 'ps-alarm-mapping',
  templateUrl: './alarm-mapping-provisioning.component.html'
})
export class AlarmMappingProvisioningComponent implements OnInit {
  clients: Client[] = [];

  loadingAlarms = false;
  alarms: IAlarmMappingBuffer[] = [];

  savingAlarmSettings = false;
  applyingAlarmSettings = false;
  removingExistingMappings = false;
  removingUnresolvedAlerts = false;

  loadingSomething = false;

  alarmSeverities = ['NONE', 'CRITICAL', 'MAJOR', 'MINOR', 'WARNING'];

  constructor(
    private credService: FakeMicroserviceService,
    private alarmMapper: AlarmMapperService,
    private alertService: AlertService,
    private tenantSelectionService: TenantSelectionService
  ) {}

  ngOnInit(): void {
    this.loadingSomething = true;
    this.credService.prepareCachedDummyMicroserviceForAllSubtenants().then(
      async (result) => {
        this.clients = await this.credService.createClients(result);
        this.loadingSomething = false;
        this.retrieveAlarms();
      },
      (error) => {
        this.clients = [];
        console.log(error);
        this.loadingSomething = false;
      }
    );
  }

  retrieveAlarms(): void {
    this.loadingAlarms = true;
    this.loadingSomething = true;
    this.alarmMapper.getFilteredAlarmListFromTenants(this.clients).then(
      (result) => {
        this.alarms = result;
        this.loadingAlarms = false;
        this.loadingSomething = false;
      },
      (error) => {
        console.log(error);
        this.loadingAlarms = false;
        this.loadingSomething = false;
        this.alarms = [];
      }
    );
  }

  saveAlarmMapping(): void {
    this.savingAlarmSettings = true;
    this.loadingSomething = true;
    this.alarmMapper.storeAlarmMappingForLaterUse(this.alarms).then(
      () => {
        this.savingAlarmSettings = false;
        this.loadingSomething = false;
      },
      (error) => {
        this.savingAlarmSettings = false;
        this.loadingSomething = false;
        console.log(error);
      }
    );
  }

  async applyAlarmMapping(): Promise<void> {
    this.applyingAlarmSettings = true;
    this.loadingSomething = true;
    let selectedTenantIds: string[] = [];
    const tenantIds = this.clients.map((tmp) => tmp.core.tenant);
    try {
      selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenantIds);
    } catch (e) {
      return;
    }

    const filteredClients = this.clients.filter((client) => selectedTenantIds.includes(client.core.tenant));
    await this.alarmMapper.storeAlarmMappingOnTenants(this.alarms, filteredClients).then(
      () => {
        this.applyingAlarmSettings = false;
        this.loadingSomething = false;
        this.alertService.success(`Applied alarm mappings to ${selectedTenantIds.length} tenants.`);
      },
      () => {
        this.applyingAlarmSettings = false;
        this.loadingSomething = false;
        this.alertService.warning(`Failed to apply alarm mappings to all selected tenants.`);
      }
    );
  }

  async removeExistingMappings(): Promise<void> {
    this.removingExistingMappings = true;
    this.loadingSomething = true;
    let selectedTenantIds: string[] = [];
    const tenantIds = this.clients.map((tmp) => tmp.core.tenant);
    try {
      selectedTenantIds = await this.tenantSelectionService.getTenantSelection(tenantIds);
    } catch (e) {
      return;
    }
    const filteredClients = this.clients.filter((client) => selectedTenantIds.includes(client.core.tenant));
    await this.alarmMapper.removeExitsingAlarmMappingFromAllTenants(filteredClients).then(
      (res) => {
        this.removingExistingMappings = false;
        this.loadingSomething = false;
        this.alertService.success(`Removed all alarm mappings from ${res.length} tenants.`);
      },
      () => {
        this.removingExistingMappings = false;
        this.loadingSomething = false;
        this.alertService.warning(`Failed to remove all alarm mappings from selected tenants.`);
      }
    );
  }
}
