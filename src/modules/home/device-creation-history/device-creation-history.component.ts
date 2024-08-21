import { Component, OnInit, ViewChild } from '@angular/core';
import { ChartDataset, ChartOptions, Point, ChartType, Plugin } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { default as pluginChartZoom } from 'chartjs-plugin-zoom';
import { DeviceDetailsService } from '@services/device-details.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Component({
  selector: 'ps-device-creation-history',
  templateUrl: './device-creation-history.component.html'
})
export class DeviceCreationHistoryComponent implements OnInit {
  @ViewChild(BaseChartDirective, { static: true }) chart: BaseChartDirective<'line'> | undefined;
  public lineChartData: ChartDataset<'line'>[] = [];
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x:
        {
          type: 'time',
          time: {
            minUnit: 'hour',
            unit: 'day',
          },
        },
      y: {}
    },
    plugins: {
      zoom: {
        // pan: {
        //   enabled: true,
        //   mode: 'x'
        // },
        zoom: {
          drag: {enabled: true, threshold: 2},
          mode: 'x',
        }
      },
      datalabels: {
        // anchor: 'end',
        // align: 'end',
        display: false
      }
    }
  };
  public readonly lineChartType = 'line' satisfies ChartType;
  public lineChartLegend = true;
  public lineChartPlugins: Plugin<'line'>[] = [
    pluginChartZoom,
    // {
    //   afterEvent: (chartInstance: BaseChartDirective<'line'>['chart'], chartEvent: any) => {
    //     console.log(chartInstance);
    //     const legend = chartInstance?.legend;
    //     const canvas = chartInstance?.canvas;
    //     const x = chartEvent.x;
    //     const y = chartEvent.y;
    //     let cursorStyle = 'default';
    //     if (!legend || !canvas) {
    //       return;
    //     }
    //     if (x <= legend.right && x >= legend.left && y <= legend.bottom && y >= legend.top) {
    //       for (const box of legend.legendItems || []) {
    //         if (x <= box.left + box.width && x >= box.left && y <= box.top + box.height && y >= box.top) {
    //           cursorStyle = 'pointer';
    //           break;
    //         }
    //       }
    //     }
    //     canvas.style.cursor = cursorStyle;
    //   }
    // }
  ];
  isLoading = true;

  constructor(private credService: FakeMicroserviceService, private deviceDetailsService: DeviceDetailsService) {}

  ngOnInit(): void {
    this.getData().then((result) => {
      this.lineChartData = [
        {
          label: 'Sum of created Devices',
          data: result.map((tmp) => ({ x: tmp.creationTime as any, y: tmp.value,  } satisfies Point)),
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
      let creationDates = devices
        .sort((a, b) => a.data.creationTime.localeCompare(b.data.creationTime))
        .map((tmp, index) => {
          return {
            label: tmp.data['name'] as string,
            value: index + 1,
            creationTime: new Date(tmp.data.creationTime)
          };
        });

      // only show a maximum of one datapoint per day
      const creationDateMap: {
        [key: string]: {
          label: string;
          value: number;
          creationTime: Date;
        };
      } = {};
      creationDates.forEach((tmp) => {
        const date = tmp.creationTime.toDateString();
        creationDateMap[date] = tmp;
      });
      creationDates = Object.keys(creationDateMap)
        .map((key) => creationDateMap[key])
        .sort((a, b) => a.creationTime.getTime() - b.creationTime.getTime());

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
