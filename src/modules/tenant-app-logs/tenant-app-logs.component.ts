import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Client, IApplication } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { IMicroserviceLog } from '@models/microservice-log';
import { combineLatest, NEVER, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { MicroserviceLogsService } from './microservice-logs.service';

@Component({
  selector: 'ps-tenant-app-logs',
  templateUrl: './tenant-app-logs.component.html'
})
export class TenantAppLogsComponent implements OnDestroy {
  loading = true;
  appId: string | undefined;
  instanceName: string | undefined;
  tenantId: string | undefined;

  app: IApplication | undefined;
  selectedLog: IMicroserviceLog | undefined;
  client: Client | undefined;

  private paramSubs = new Subscription();

  constructor(private route: ActivatedRoute, private msLogs: MicroserviceLogsService, private alert: AlertService) {
    const currentRouteParams$ = this.route.params.pipe(filter((tmp) => tmp['appId'] && tmp['instanceName']));
    const tenantId$ = this.route.parent?.params.pipe(
      filter((tmp) => tmp['id']),
      map((tmp) => tmp['id'])
    ) ||NEVER;
    this.paramSubs = combineLatest([currentRouteParams$, tenantId$]).subscribe(
      ([{ appId, instanceName }, tenantId]) => {
        this.appId = appId;
        this.tenantId = tenantId;
        this.loadLog(tenantId, appId, instanceName);
      }
    );
  }

  ngOnDestroy(): void {
    if (this.paramSubs) {
      this.paramSubs.unsubscribe();
    }
  }

  async loadLog(tenantId: string, appId: string, instanceName: string): Promise<void> {
    this.loading = true;
    try {
      const { app, log } = await this.msLogs.loadLogsAndAppForSpecificInstance(tenantId, appId, instanceName);
      this.app = app;
      this.selectedLog = log;
    } catch (e) {
      this.app = undefined;
      this.selectedLog = undefined;
      this.alert.danger(`Failed to load logs for app: ${appId}`);
    }

    this.loading = false;
  }

  async downloadLogFile(): Promise<void> {
    await this.msLogs.downloadLogFile(this.tenantId as string, this.appId as string, this.selectedLog?.instanceName as string);
  }
}
