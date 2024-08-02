import { Component, OnInit } from '@angular/core';
import { Client, IManagedObject, IResultList, ITenant } from '@c8y/client';
import { OperationRealtimeService } from '@c8y/ngx-components';
import { AdvancedSoftwareService, RepositoryService, RepositoryType } from '@c8y/ngx-components/repository/shared';
import { DeviceDetailsService } from '@services/device-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { SubtenantDetailsService } from '@services/subtenant-details.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  providers: [RepositoryService, OperationRealtimeService, AdvancedSoftwareService],
  selector: 'ps-firmware-statistics',
  templateUrl: './firmware-statistics.component.html',
  styleUrls: ['./firmware-statistics.component.css']
})
export class FirmwareStatisticsComponent implements OnInit {
  isLoading = false;
  chartMessage: string = '';
  charts: {
    label: string;
    type: string;
    firmwareName: string;
    labels: string[];
    values: number[];
  }[] = [];
  currentChart: {
    label: string;
    type: string;
    firmwareName: string;
    labels: string[];
    values: number[];
  };

  textFilter$: BehaviorSubject<string> = new BehaviorSubject('');
  textFilterSubtenants$: BehaviorSubject<string> = new BehaviorSubject('');
  reload$: BehaviorSubject<void> = new BehaviorSubject(null);
  reloading: boolean = false;

  firmwareVersions: IResultList<IManagedObject>;

  clients: Client[];

  tenantSearchString: string;
  tenantDetails: ITenant[];
  filteredTenants: ITenant[];
  selectedTenant: ITenant;

  firmwareSearchString: string;
  firmwareList: IManagedObject[];
  selectedFirmware: IManagedObject;

  constructor(
    private credService: FakeMicroserviceService,
    private deviceDetailsService: DeviceDetailsService,
    private repositoryService: RepositoryService,
    private tenantService: SubtenantDetailsService
  ) {}

  async ngOnInit(): Promise<void> {
    this.tenantDetails = await this.tenantService.getCachedTenants();
    this.filteredTenants = this.tenantDetails;
    this.firmwareList = await this.getFirmwares('');

    await this.loadClients();
  }

  async getFirmwares(partialText?: string) {
    const properties: string[] = ['name', 'description', 'c8y_Filter.type'];
    const partialTextFilter = { partialText, properties };
    const result = await this.repositoryService.listRepositoryEntries(RepositoryType.FIRMWARE, {
      partialTextFilter
    });
    return result.data;
  }

  resetTenantSearchString() {
    this.tenantSearchString = '';
    this.filteredTenants = this.tenantDetails;
  }

  onTenantSearch() {
    if (this.tenantSearchString.length > 0) {
      this.filteredTenants = this.tenantDetails.filter(
        (tenant) =>
          tenant.id.toLowerCase().includes(this.tenantSearchString.toLowerCase()) ||
          tenant.domain.toLowerCase().includes(this.tenantSearchString.toLowerCase())
      );
    } else {
      this.filteredTenants = this.tenantDetails;
    }
  }

  async resetFirmwareSearchString() {
    this.firmwareSearchString = '';
    this.firmwareList = await this.getFirmwares(this.firmwareSearchString);
  }

  async onFirmwareSearch() {
    this.firmwareList = await this.getFirmwares(this.firmwareSearchString);
  }

  onFirmwareSelected(firmware: IManagedObject) {
    this.selectedFirmware = firmware;
    this.loadChart();
  }

  onTenantSelected(tenant: ITenant) {
    this.selectedTenant = tenant;
    this.loadChart();
  }

  async loadChart() {
    this.isLoading = true;
    this.chartMessage = '';
    if (this.selectedFirmware && this.selectedTenant) {
      if (!this.clients) {
        await this.loadClients();
      }
      const client = this.clients.find((cl) => cl.core.tenant === this.selectedTenant.id);
      const result = await this.deviceDetailsService.getFirmwareStatistics(client, this.selectedFirmware);
      const labels = Array.from(result.keys());
      const values = Array.from(result.values());
      if (values.length > 0 && labels.length > 0) {
        this.currentChart = {
          label: 'Firmware Statistics',
          type: '',
          firmwareName: '',
          labels: labels,
          values: values
        };
      } else {
        this.chartMessage = 'No device available for the selected firmware and tenant.';
      }
    }
    this.isLoading = false;
  }
  async loadClients() {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    this.clients = await this.credService.createClients(credentials);
  }
}
