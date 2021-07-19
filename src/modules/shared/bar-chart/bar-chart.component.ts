import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { ChartDataSets, ChartOptions, ChartType, TimeUnit } from 'chart.js';
import { BaseChartDirective, Color, Label } from 'ng2-charts';
import * as pluginDataLabels from 'chartjs-plugin-datalabels';

@Component({
  selector: 'ps-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.less']
})
export class BarChartComponent implements OnChanges {
  @ViewChild(BaseChartDirective, { static: true }) chart: BaseChartDirective;
  @Input() public barChartLabels: Label[] = [];
  @Input() public barChartData: ChartDataSets[] = [];
  @Input() public timeUnit: TimeUnit;
  @Input() public minTimeUnit: TimeUnit;
  public barChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      xAxes: [
        {
          type: 'time',
          time: {
            ticks: {
              autoSkip: true
            }
          },
          offset: true
        }
      ],
      yAxes: [{}]
    },
    plugins: {
      datalabels: {
        anchor: 'end',
        align: 'end'
      }
    }
  };
  public barChartType: ChartType = 'bar';
  public barChartLegend = false;
  public barChartPlugins = [pluginDataLabels];
  public barChartColors: Color[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    this.barChartOptions.scales.xAxes[0].time.unit = this.timeUnit;
    this.barChartOptions.scales.xAxes[0].time.minUnit = this.minTimeUnit;
  }
}
