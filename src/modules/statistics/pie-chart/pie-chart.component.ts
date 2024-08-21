import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChartData, ChartOptions, ChartType, Plugin } from 'chart.js';
import { ChartEvent } from 'chart.js/dist/core/core.plugins';
import 'chartjs-plugin-datalabels';

@Component({
  selector: 'ps-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.less']
})
export class PieChartComponent {
  @Input() pieChartData: ChartData<"pie", number[], any> = {datasets: []};
  @Output() indexClicked = new EventEmitter<number>();
  public pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    layout: {
      padding: 15
    },
    maintainAspectRatio: false,
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
      const target = event.native?.target as HTMLElement;
      target.style.cursor = cursor;
    }
  };
  @Input() pieChartLabels: any[] = [];
  public readonly pieChartType = 'pie' satisfies ChartType;
  public pieChartLegend = true;
  public pieChartPlugins: Plugin<'pie'>[] = [];
  public chartUnit = '%';

  onChartClick(event: {
    event?: ChartEvent;
    active?: object[];
  }): void {
    if (event && event.active && event.active.length) {
      this.indexClicked.emit((<any>event.active[0]).index);
    }
  }
}
