import { Component } from '@angular/core';
import { DeviceDetailsService } from '@services/device-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Component({
  selector: 'ps-firmware-statistics',
  templateUrl: './firmware-statistics.component.html'
})
export class FirmwareStatisticsComponent {
  isLoading = true;
  charts: {
    label: string;
    labels: string[];
    values: number[];
  }[] = [];
  currentChart: {
    label: string;
    labels: string[];
    values: number[];
  };

  constructor(private credService: FakeMicroserviceService, private deviceDetailsService: DeviceDetailsService) {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.fetchForPage().then(
      (result) => {
        this.charts = result.map((tmp) => {
          return {
            label: tmp.label,
            labels: tmp.entries.map((entry) => entry.version),
            values: tmp.entries.map((entry) => entry.count)
          };
        });
        if (this.charts.length) {
          this.currentChart = this.charts[0];
        }
        this.isLoading = false;
      },
      () => {
        this.charts = [];
        this.currentChart = null;
        this.isLoading = false;
      }
    );
  }

  public selectChart(chart: { label: string; labels: string[]; values: number[] }): void {
    this.currentChart = chart;
  }

  private async fetchForPage(): Promise<
    {
      label: string;
      entries: {
        version: string;
        count: number;
      }[];
    }[]
  > {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = this.credService.createClients(credentials);
    const result = await this.deviceDetailsService.getFirmwareStatisticsOfTenants(clients);
    const mappedResult = Array.from(result.entries()).map(([key, value]) => {
      const childEntries = Array.from(value.entries())
        .map(([key2, value2]) => {
          return {
            version: key2,
            count: value2
          };
        })
        .sort((a, b) => b.count - a.count);
      return {
        label: key,
        entries: childEntries
      };
    });
    return mappedResult;
  }
}
