import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Client, IApplication } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { IMicroserviceLog } from '@models/microservice-log';
import { combineLatest, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { MicroserviceLogsService } from './microservice-logs.service';

@Component({
  selector: 'ps-tenant-app-logs',
  templateUrl: './tenant-app-logs.component.html'
})
export class TenantAppLogsComponent implements OnDestroy {
  loading = true;
  appId: string;
  tenantId: string;

  app: IApplication;

  logs: IMicroserviceLog[] = [];
  selectedLog: IMicroserviceLog;
  client: Client;

  private paramSubs = new Subscription();

  constructor(private route: ActivatedRoute, private msLogs: MicroserviceLogsService, private alert: AlertService) {
    const appId$ = this.route.params.pipe(
      filter((tmp) => tmp.appId),
      map((tmp) => tmp.appId)
    );
    const tenantId$ = this.route.parent.params.pipe(
      filter((tmp) => tmp.id),
      map((tmp) => tmp.id)
    );
    this.paramSubs = combineLatest([appId$, tenantId$]).subscribe(([appId, tenantId]) => {
      this.appId = appId;
      this.tenantId = tenantId;
      this.loadLog(appId, tenantId);
    });
  }

  ngOnDestroy(): void {
    if (this.paramSubs) {
      this.paramSubs.unsubscribe();
    }
  }

  async loadLog(appId: string, tenantId: string): Promise<void> {
    this.loading = true;
    try {
      const { app, logs } = await this.msLogs.loadLog(appId, tenantId);
      this.app = app;
      this.logs = logs;
      if (logs.length) {
        this.selectedLog = this.logs[0];
      } else {
        this.alert.warning(`No logs found for app ${appId}`);
      }
    } catch (e) {
      this.app = undefined;
      this.logs = [];
      this.selectedLog = undefined;
      this.alert.danger(`Failed to load logs for app: ${appId}`);
    }

    this.loading = false;
  }

  async downloadLogFile(): Promise<void> {
    await this.msLogs.downloadLogFile(this.tenantId, this.appId, this.selectedLog.instanceName);
  }
}
