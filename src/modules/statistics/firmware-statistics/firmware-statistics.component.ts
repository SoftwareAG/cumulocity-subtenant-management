import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DeviceDetailsService } from '@services/device-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { ChartData } from 'chart.js';
import { flatten } from 'lodash-es';

@Component({
  selector: 'ps-firmware-statistics',
  templateUrl: './firmware-statistics.component.html'
})
export class FirmwareStatisticsComponent {
  isLoading = true;
  charts: {
    label: string;
    type: string;
    firmwareName: string;
    labels: string[];
    data: ChartData<"pie", number[], any>;
  }[] = [];
  currentChart: {
    label: string;
    type: string;
    firmwareName: string;
    labels: string[];
    data: ChartData<"pie", number[], any>;
  } | null = null;

  constructor(
    private credService: FakeMicroserviceService,
    private deviceDetailsService: DeviceDetailsService,
    private router: Router
  ) {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.fetchForPage().then(
      (result) => {
        this.charts = result.map((tmp) => {
          const values = tmp.entries.map((entry) => entry.count);
          const labels = tmp.entries.map((entry) => entry.version);
          return {
            label: tmp.label,
            type: tmp.type,
            firmwareName: tmp.firmwareName,
            labels: labels,
            data: {datasets: [{data: values}], labels}
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

  public selectChart(chart: {
    label: string;
    type: string;
    firmwareName: string;
    labels: string[];
    data: ChartData<"pie", number[], any>;
  }): void {
    this.currentChart = chart;
  }

  private async fetchForPage(): Promise<
    {
      label: string;
      type: string;
      firmwareName: string;
      entries: {
        version: string;
        count: number;
      }[];
    }[]
  > {
    const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
    const clients = await this.credService.createClients(credentials);
    const result = await this.deviceDetailsService.getFirmwareStatisticsOfTenants(clients);
    const mappedResult = Array.from(result.entries()).map(([type, value]) => {
      return Array.from(value.entries()).map(([firmwareName, value2]) => {
        const childEntries = Array.from(value2.entries())
          .map(([key2, value3]) => {
            return {
              version: key2,
              count: value3
            };
          })
          .sort((a, b) => b.count - a.count);
        return {
          label: `${type} - ${firmwareName}`,
          type,
          firmwareName,
          entries: childEntries
        };
      });
    });
    return flatten(mappedResult);
  }

  pieChartClicked(index: number): void {
    if (!this.currentChart) {
      return;
    }
    const lookupPath = 'lookup';
    const devicePath = 'device';
    const config = this.router.config;
    const lookupConfig = config.find((tmp) => tmp.path === lookupPath);
    if (lookupConfig && lookupConfig.children && lookupConfig.children.find((tmp) => tmp.path === devicePath)) {
      const labels = this.currentChart.data.labels || [];
      const firmwareVersion = labels[index];
      const type = this.currentChart.type;
      const firmwareName = this.currentChart.firmwareName;

      this.router.navigate([lookupPath, devicePath], {
        queryParams: {
          firmwareVersion,
          type,
          firmwareName
        }
      });
    }
  }
}
