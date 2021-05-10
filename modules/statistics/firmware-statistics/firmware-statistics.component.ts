import { Component, OnInit } from '@angular/core';
import { DeviceDetailsService } from '@services/device-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Component({
  selector: 'ps-firmware-statistics',
  templateUrl: './firmware-statistics.component.html'
})
export class FirmwareStatisticsComponent implements OnInit {
  versionArray = new Array<{version: string, count: number}>();
  totalNumberOfInstalledFirmwares = 0;
  isLoading = true;

  constructor(
    private credService: FakeMicroserviceService,
    private deviceDetailsService: DeviceDetailsService
  ) { }

  ngOnInit() {
    this.credService.prepareCachedDummyMicroserviceForAllSubtenants().then(async (credentials) => {
      const clients = this.credService.createClients(credentials);
      const stats = await this.deviceDetailsService.getFirmwareStatisticsOfTenants(clients);
      this.versionArray = [];
      this.totalNumberOfInstalledFirmwares = 0;
      stats.forEach((value, key) => {
        this.versionArray.push({version: key, count: value});
        this.totalNumberOfInstalledFirmwares = this.totalNumberOfInstalledFirmwares + value;
      });
      this.versionArray.sort((a, b) => b.count - a.count);
      this.isLoading = false;
    });
  }

}
