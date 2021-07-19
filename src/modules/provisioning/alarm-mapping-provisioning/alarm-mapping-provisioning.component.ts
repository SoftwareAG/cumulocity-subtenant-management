import { Component, OnInit } from '@angular/core';
import { Client } from '@c8y/client';
import { IAlarmMappingBuffer } from '@models/AlarmMappingBuffer';
import { AlarmMapperService } from '@services/alarm-mapper.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { BsModalService } from 'ngx-bootstrap/modal';
import { TenantSelectionComponent } from '@modules/shared/tenant-selection/tenant-selection.component';
import { AlertService } from '@c8y/ngx-components';

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
    private modalService: BsModalService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadingSomething = true;
    this.credService.prepareCachedDummyMicroserviceForAllSubtenants().then(
      (result) => {
        this.clients = this.credService.createClients(result);
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
    const tenantIds = this.clients.map((tmp) => ({ name: tmp.core.tenant }));
    const response = new Subject<{ name: string }[]>();
    response
      .asObservable()
      .pipe(
        take(1),
        filter((tmp) => !!tmp)
      )
      .subscribe(async (res) => {
        const selectedTenantsIds = res.map((tmp) => tmp.name);
        const filteredClients = this.clients.filter((client) => selectedTenantsIds.includes(client.core.tenant));
        this.alarmMapper.storeAlarmMappingOnTenants(this.alarms, filteredClients).then(
          () => {
            this.applyingAlarmSettings = false;
            this.loadingSomething = false;
            this.alertService.success(`Applied alarm mappings to ${res.length} tenants.`);
          },
          (error) => {
            console.log(error);
            this.applyingAlarmSettings = false;
            this.loadingSomething = false;
            this.alertService.success(`Failed to apply alarm mappings to all selected tenants.`);
          }
        );
      });
    this.modalService.show(TenantSelectionComponent, {
      initialState: { response, tenants: tenantIds } as Partial<TenantSelectionComponent>,
      ignoreBackdropClick: true
    });
  }

  removeExistingMappings(): void {
    this.removingExistingMappings = true;
    this.loadingSomething = true;
    const tenantIds = this.clients.map((tmp) => ({ name: tmp.core.tenant }));
    const response = new Subject<{ name: string }[]>();
    response
      .asObservable()
      .pipe(
        take(1),
        filter((tmp) => !!tmp)
      )
      .subscribe(async (res) => {
        const selectedTenantsIds = res.map((tmp) => tmp.name);
        const filteredClients = this.clients.filter((client) => selectedTenantsIds.includes(client.core.tenant));
        this.alarmMapper.removeExitsingAlarmMappingFromAllTenants(filteredClients).then(
          (res) => {
            this.removingExistingMappings = false;
            this.loadingSomething = false;
            this.alertService.success(`Removed all alarm mappings from ${res.length} tenants.`);
          },
          (error) => {
            console.log(error);
            this.removingExistingMappings = false;
            this.loadingSomething = false;
            this.alertService.success(`Failed to remove all alarm mappings from selected tenants.`);
          }
        );
      });
    this.modalService.show(TenantSelectionComponent, {
      initialState: { response, tenants: tenantIds } as Partial<TenantSelectionComponent>,
      ignoreBackdropClick: true
    });
  }
}
