import { Component, OnInit, ViewChild } from '@angular/core';
import { ChartDataSets, ChartOptions, ChartPoint, ChartType } from 'chart.js';
import { BaseChartDirective, Color, Label } from 'ng2-charts';
import * as pluginChartZoom from 'chartjs-plugin-zoom';
import { DeviceDetailsService } from '@services/device-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Component({
  selector: 'ps-device-creation-history',
  templateUrl: './device-creation-history.component.html'
})
export class DeviceCreationHistoryComponent implements OnInit {
  @ViewChild(BaseChartDirective, { static: true }) chart: BaseChartDirective;
  public lineChartLabels: Label[] = [];
  public lineChartData: ChartDataSets[] = [];
  public lineChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      xAxes: [
        {
          type: 'time',
          time: {
            minUnit: 'hour',
            unit: 'day',
            ticks: {
              autoSkip: true
            }
          }
        }
      ],
      yAxes: [{}]
    },
    plugins: {
      zoom: {
        // pan: {
        //   enabled: true,
        //   mode: 'x'
        // },
        zoom: {
          enabled: true,
          drag: true,
          mode: 'x',
          speed: 0.1,
          threshold: 2
        }
      },
      datalabels: {
        // anchor: 'end',
        // align: 'end',
        display: false
      }
    },
    tooltips: {
      mode: 'nearest',
      intersect: false,
      callbacks: {}
    }
  };
  public lineChartType: ChartType = 'line';
  public lineChartLegend = true;
  public lineChartPlugins = [
    pluginChartZoom,
    {
      afterEvent: (chartInstance, chartEvent) => {
        const legend = chartInstance.legend;
        const canvas = chartInstance.chart.canvas;
        const x = chartEvent.x;
        const y = chartEvent.y;
        let cursorStyle = 'default';
        if (x <= legend.right && x >= legend.left && y <= legend.bottom && y >= legend.top) {
          for (const box of legend.legendHitBoxes) {
            if (x <= box.left + box.width && x >= box.left && y <= box.top + box.height && y >= box.top) {
              cursorStyle = 'pointer';
              break;
            }
          }
        }
        canvas.style.cursor = cursorStyle;
      }
    }
  ];
  public lineChartColors: Color[] = [
    // {
    //   backgroundColor: 'transparent',
    //   borderColor: 'rgba(148,159,177,1)',
    //   pointBackgroundColor: 'rgba(148,159,177,1)',
    //   pointBorderColor: '#fff',
    //   pointHoverBackgroundColor: '#fff',
    //   pointHoverBorderColor: 'rgba(148,159,177,0.8)'
    // }
  ];
  isLoading = true;

  constructor(private credService: FakeMicroserviceService, private deviceDetailsService: DeviceDetailsService) {}

  ngOnInit(): void {
    this.getData().then((result) => {
      this.lineChartData = [
        {
          label: 'Sum of created Devices',
          data: result.map((tmp) => ({ t: tmp.creationTime, y: tmp.value } as ChartPoint)),
          pointBackgroundColor: 'green',
          backgroundColor: 'transparent',
          borderColor: '#1776BF'
        }
      ];
    });
  }

  async getData(): Promise<
    {
      label: string;
      value: number;
      creationTime: Date;
    }[]
  > {
    this.isLoading = true;
    try {
      const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
      const clients = await this.credService.createClients(credentials);
      const devices = await this.deviceDetailsService.deviceLookup(clients, '$filter=has(c8y_IsDevice)');
      const creationDates = devices
        .sort((a, b) => a.data.creationTime.localeCompare(b.data.creationTime))
        .map((tmp, index) => {
          return {
            label: tmp.data.name,
            value: index + 1,
            creationTime: new Date(tmp.data.creationTime)
          };
        });
      this.isLoading = false;
      return creationDates;
    } catch (e) {
      this.isLoading = false;
      throw e;
    }
  }

  resetZoom(): void {
    // @ts-ignore
    this.chart.chart.resetZoom();
  }
}
