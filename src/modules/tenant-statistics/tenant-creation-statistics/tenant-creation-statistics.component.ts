import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Client, IResultList, ITenant } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { ChartDataSets, ChartPoint, TimeUnit } from 'chart.js';
import * as moment from 'moment';
import { Label } from 'ng2-charts';

export enum Timeframes {
  last_day = 'last_day',
  last_week = 'last_week',
  last_month = 'last_month',
  last_year = 'last_year'
}

export interface DateTuple {
  startDate: string;
  endDate: string;
  label: string;
}

@Component({
  selector: 'ps-tenant-creation-statistics',
  templateUrl: './tenant-creation-statistics.component.html'
})
export class TenantCreationStatisticsComponent implements OnInit {
  tenant: ITenant;
  api: string;
  timeframe: Timeframes = Timeframes.last_day;
  isLoading = false;
  chartData: ChartDataSets[] = [];
  labels: Label[] = [];
  timeUnit: TimeUnit = 'hour';
  minTimeUnit: TimeUnit;
  timeframeArr = [
    { label: 'Last 24h', value: Timeframes.last_day },
    { label: 'Last 7 days', value: Timeframes.last_week },
    { label: 'Last 30 days', value: Timeframes.last_month },
    { label: 'Last 12 Month', value: Timeframes.last_year }
  ];
  total: number = null;

  constructor(
    private route: ActivatedRoute,
    private credService: FakeMicroserviceService,
    private alertService: AlertService
  ) {
    this.tenant = this.route.snapshot.parent.data.contextData;
    const urlSegments = this.route.snapshot.url;
    if (urlSegments && urlSegments.length) {
      const lastSegment = urlSegments[urlSegments.length - 1];
      this.api = lastSegment.path;
    }
  }

  ngOnInit(): void {
    this.loadData(this.timeframe);
  }

  onTimeframeChange(): void {
    this.loadData(this.timeframe);
    switch (this.timeframe) {
      case Timeframes.last_day: {
        this.timeUnit = 'hour';
        break;
      }
      case Timeframes.last_week: {
        this.timeUnit = 'day';
        break;
      }
      case Timeframes.last_month: {
        this.timeUnit = 'day';
        break;
      }
      case Timeframes.last_year: {
        this.timeUnit = 'month';
        break;
      }
      default: {
        break;
      }
    }
  }

  async loadData(timeframe: Timeframes): Promise<void> {
    this.isLoading = true;
    try {
      const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
      const tenantCredentials = credentials.find((tmp) => tmp.tenant === this.tenant.id);
      if (tenantCredentials) {
        const client = this.credService.createClients([tenantCredentials])[0];
        this.getTotal(client, this.api);
        const filters = this.getDates(timeframe);
        const promArray = filters.map((tmp) => this.getChartPoint(client, this.api, tmp));
        const datapoints = await Promise.all(promArray);
        this.chartData = [{ data: datapoints.map((tmp) => tmp.y as number), label: this.api }];
        this.labels = datapoints.map((tmp) => tmp.x as string);
      } else {
        this.alertService.warning(`Credentials for tenant: ${this.tenant.id} not found.`);
      }
    } catch (e) {
      console.error(e);
      this.alertService.danger(`Error loading statistics of tenant: ${this.tenant.id}`);
    }
    this.isLoading = false;
  }

  private getDates(timeframe: Timeframes): DateTuple[] {
    const filterArray = new Array<DateTuple>();
    const currentDate = moment();
    let numberOfFilters = 0;
    let startDate = currentDate.utc().set('minutes', 0).set('seconds', 0).set('minutes', 0).set('milliseconds', 0);
    if (timeframe === Timeframes.last_day) {
      numberOfFilters = 24;
    } else if (timeframe === Timeframes.last_week) {
      startDate = startDate.set('hours', 0);
      numberOfFilters = 7;
    } else if (timeframe === Timeframes.last_month) {
      startDate = startDate.set('hours', 0);
      numberOfFilters = 30;
    } else if (timeframe === Timeframes.last_year) {
      startDate = startDate.set('dates', 1).set('hours', 0);
      numberOfFilters = 12;
    }
    let previousDate = startDate.clone();
    for (let i = 0; i < numberOfFilters; i++) {
      const startDate = previousDate.clone().subtract(1, this.getSubstractUnit(timeframe));
      const startDateString = startDate.clone().set('milliseconds', 1).toISOString();
      filterArray.push({
        startDate: startDateString,
        endDate: previousDate.clone().toISOString(),
        label: startDateString // this.getLabel(timeframe, startDate)
      });
      previousDate = startDate.clone();
    }

    return filterArray.reverse();
  }

  private getSubstractUnit(timeframe: Timeframes): moment.DurationInputArg2 {
    switch (timeframe) {
      case Timeframes.last_day:
        return 'hour';
      case Timeframes.last_week:
        return 'days';
      case Timeframes.last_month:
        return 'days';
      case Timeframes.last_year:
        return 'months';
      default:
        return 'months';
    }
  }

  private getLabel(timeframe: Timeframes, date: moment.Moment): string {
    switch (timeframe) {
      case Timeframes.last_day:
        return date.format('HH:mm');
      case Timeframes.last_week:
        return date.format('YYYY-MM-DD');
      case Timeframes.last_month:
        return date.format('YYYY-MM-DD');
      case Timeframes.last_year:
        return date.format('YYYY-MM');
      default:
        return date.format('YYYY-MM');
    }
  }

  private getChartPoint(client: Client, api: string, dates: DateTuple): Promise<ChartPoint> {
    const listFunc = client[api].list.bind(client[api]);
    const filter: any = {};
    if (api !== 'inventory') {
      filter.dateFrom = dates.startDate;
      filter.dateTo = dates.endDate;
    } else {
      filter.query = `creationTime.date gt '${dates.startDate}' and creationTime.date lt '${dates.endDate}'`;
    }
    return this.fetchCount(listFunc, filter).then((result) => {
      return { x: new Date(dates.label), y: result };
    });
  }

  private fetchCount(list: (filter?: any) => Promise<IResultList<any>>, filter?: any): Promise<number> {
    const filters = Object.assign(filter || {}, {
      pageSize: 1,
      currentPage: 1,
      withTotalPages: true
    });

    return list(filters).then((result) => result.paging.totalPages);
  }

  private getTotal(client: Client, api: string): void {
    const listFunc = client[api].list.bind(client[api]);
    this.fetchCount(listFunc).then(
      (result) => {
        this.total = result;
      },
      () => {
        this.total = null;
      }
    );
  }
}
