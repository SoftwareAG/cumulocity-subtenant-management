import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { ChartDataset, ChartOptions, ChartType, Plugin, TimeUnit } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import 'chartjs-plugin-datalabels';

@Component({
  selector: 'ps-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.less']
})
export class BarChartComponent implements OnChanges {
  @ViewChild(BaseChartDirective, { static: true }) chart: BaseChartDirective<'bar'> | undefined;
  @Input() public barChartLabels: any[] = [];
  @Input() public barChartData: ChartDataset<'bar'>[] = [];
  @Input() public timeUnit: TimeUnit | undefined;
  @Input() public minTimeUnit: TimeUnit | undefined;
  public barChartOptions: ChartOptions<'bar'> = {
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
          offset: true
        },
      y: {}
    },
    plugins: {
      datalabels: {
        anchor: 'end',
        align: 'end'
      }
    }
  };
  public readonly barChartType = 'bar' satisfies ChartType;
  public barChartLegend = false;
  public barChartPlugins: Plugin<'bar'>[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    const xAxes: any = this.barChartOptions.scales?.['xAxes'] || {};
    const time = xAxes?.time || {};
    time.unit = this.timeUnit;
    time.minUnit = this.minTimeUnit;
  }
}
