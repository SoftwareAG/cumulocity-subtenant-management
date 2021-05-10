import { Component } from '@angular/core';
import { DeviceDetailsService } from '@services/device-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Component({
  selector: 'ps-inventory-statistics',
  templateUrl: './inventory-statistics.component.html'
})
export class InventoryStatisticsComponent {
  query = 'has(c8y_IsDevice)';
  isLoading = false;

  response: { tenant: string; count: number }[] = [];

  constructor(private credService: FakeMicroserviceService, private deviceDetailsService: DeviceDetailsService) {}

  lookup(): void {
    this.isLoading = true;
    this.credService.prepareCachedDummyMicroserviceForAllSubtenants().then(async (credentials) => {
      const clients = this.credService.createClients(credentials);
      this.response = await this.deviceDetailsService.countDevicesMatchingQuery(clients, this.query);
      this.response.sort((a, b) => a.tenant.localeCompare(b.tenant));
      this.isLoading = false;
    });
  }
}
