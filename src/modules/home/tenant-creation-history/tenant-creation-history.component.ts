import { Component, OnInit, ViewChild } from '@angular/core';
import { ITenant, TenantStatus } from '@c8y/client';
import { SubtenantDetailsService } from '@services/subtenant-details.service';
import { ChartDataset, ChartOptions, Point, ChartType, Plugin } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { default as pluginChartZoom } from 'chartjs-plugin-zoom';

@Component({
  selector: 'ps-tenant-creation-history',
  templateUrl: './tenant-creation-history.component.html'
})
export class TenantCreationHistoryComponent implements OnInit {
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
          }
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
          drag: {
            enabled: true,
            threshold: 2
          },
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
    //       for (const box of legend.legendHitBoxes) {
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

  constructor(private tenantService: SubtenantDetailsService) {}

  ngOnInit(): void {
    this.getData().then((result) => {
      this.lineChartData = [
        {
          label: 'Sum of created Tenants',
          data: result.map((tmp) => ({ x: tmp.creationTime as any, y: tmp.value })),
          pointBackgroundColor: result.map((tmp) => {
            return tmp.status === TenantStatus.ACTIVE ? 'green' : 'red';
          }),
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
      status: TenantStatus;
    }[]
  > {
    this.isLoading = true;
    const tenants = (await this.tenantService.getCachedTenants()) as (ITenant & { creationTime: string })[];
    let creationDates = tenants
      .sort((a, b) => a.creationTime.localeCompare(b.creationTime))
      .map((tmp, index) => {
        return {
          label: tmp.domain,
          value: index + 1,
          creationTime: new Date(tmp.creationTime),
          status: tmp.status
        };
      });

    // only show a maximum of one datapoint per day
    const creationDateMap: {
      [key: string]: {
        label: string;
        value: number;
        creationTime: Date;
        status: TenantStatus;
      };
    } = {};
    creationDates.forEach((tmp) => {
      const date = tmp.creationTime.toDateString();
      creationDateMap[date] = tmp as any;
    });
    const finalCreationDates = Object.keys(creationDateMap)
      .map((key) => creationDateMap[key])
      .sort((a, b) => a.creationTime.getTime() - b.creationTime.getTime());

    this.isLoading = false;
    return finalCreationDates;
  }

  resetZoom(): void {
    // @ts-ignore
    this.chart.chart.resetZoom();
  }
}
