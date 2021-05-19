import { Component, OnInit, ViewChild } from '@angular/core';
import { ITenant, TenantStatus } from '@c8y/client';
import { SubtenantDetailsService } from '@services/subtenant-details.service';
import { ChartDataSets, ChartOptions, ChartPoint, ChartType } from 'chart.js';
import { BaseChartDirective, Color, Label } from 'ng2-charts';
import * as pluginChartZoom from 'chartjs-plugin-zoom';

@Component({
  selector: 'ps-tenant-creation-history',
  templateUrl: './tenant-creation-history.component.html'
})
export class TenantCreationHistoryComponent implements OnInit {
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

  constructor(private tenantService: SubtenantDetailsService) {}

  ngOnInit(): void {
    this.getData().then((result) => {
      console.log(result);
      console.log(result.filter((tmp) => tmp.status === TenantStatus.SUSPENDED));
      this.lineChartData = [
        {
          label: 'Sum of created Tenants',
          data: result.map((tmp) => ({ t: tmp.creationTime, y: tmp.value } as ChartPoint)),
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
    const tenants = (await this.tenantService.getCachedTenants()) as (ITenant & { creationTime: string })[];
    const creationDates = tenants
      .sort((a, b) => a.creationTime.localeCompare(b.creationTime))
      .map((tmp, index) => {
        return {
          label: tmp.domain,
          value: index + 1,
          creationTime: new Date(tmp.creationTime),
          status: tmp.status
        };
      });

    return creationDates;
  }

  resetZoom(): void {
    // @ts-ignore
    this.chart.chart.resetZoom();
  }
}
