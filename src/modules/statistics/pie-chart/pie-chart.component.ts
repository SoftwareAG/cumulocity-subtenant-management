import { Component, Input } from '@angular/core';
import { ChartOptions, ChartType } from 'chart.js';
import { Color, Label } from 'ng2-charts';
import * as pluginDataLabels from 'chartjs-plugin-datalabels';

@Component({
  selector: 'ps-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.less']
})
export class PieChartComponent {
  @Input() pieChartData: number[];
  public pieChartOptions: ChartOptions = {
    responsive: true,
    // legend: {
    //     position: 'top',
    //     align: 'end'
    // },
    layout: {
      padding: 15
    },
    maintainAspectRatio: false,
    legend: {
      position: 'bottom'
    },
    plugins: {
      datalabels: {
        backgroundColor: 'black',
        color: 'white',
        opacity: 0.8,
        borderRadius: 2,
        font: {
          size: 18
        },
        formatter: (value, ctx) => {
          if (Number.isNaN(value)) {
            return null;
          }

          // filtered percentage
          // @ts-ignore
          const metadata = ctx.dataset._meta;
          for (const key of Object.keys(metadata)) {
            if (metadata[key] && metadata[key].hasOwnProperty('total')) {
              const percentange = value / (metadata[key].total / 100);
              if (Number.isNaN(percentange) || percentange < 5) {
                return null;
              }
              return percentange.toFixed(1) + '%';
            }
          }

          // total percentage ignoring filter
          if (
            ctx.chart.data &&
            ctx.chart.data.datasets &&
            ctx.chart.data.datasets[0] &&
            ctx.chart.data.datasets[0].data
          ) {
            const valueArray: number[] = ctx.chart.data.datasets[0].data as number[];
            const sum = valueArray.reduce((prev, curr) => prev + curr, 0);
            if (sum && value) {
              return (value / (sum / 100)).toFixed(1) + '%';
            } else {
              return '0%';
            }
          }

          // just the actual value
          return value;
        },
        offset: -40,
        align: 'end',
        anchor: 'end'
      }
    },
    onHover: (event, activeElement) => {
      // cursor change for chart
      let cursor = 'default';
      if (activeElement && activeElement.length) {
        cursor = 'pointer';
      }
      const target = event.target as HTMLElement;
      target.style.cursor = cursor;
    }
  };
  public pieChartColors: Color[] = [];
  @Input() pieChartLabels: Label[] = [];
  // public pieChartData: Array<number | null | undefined | number[]> | ChartPoint[] = [];
  public pieChartType: ChartType = 'pie';
  public pieChartLegend = true;
  public pieChartPlugins = [pluginDataLabels];
  public chartUnit = '%';

  constructor() {
    this.pieChartColors = [];
  }
}
