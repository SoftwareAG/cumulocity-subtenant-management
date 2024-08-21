import { Injectable } from '@angular/core';
import { Client, IApplication } from '@c8y/client';
import { IMicroserviceLog } from '@models/microservice-log';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Injectable({
  providedIn: 'root'
})
export class MicroserviceLogsService {
  constructor(private credService: FakeMicroserviceService) {}

  public async loadLogsAndAppForSpecificInstance(
    tenantId: string,
    appId: string,
    instanceName: string,
    dateFrom?: string
  ): Promise<{ app: IApplication; log: IMicroserviceLog }> {
    const client = await this.credService.getClientForTenant(tenantId);
    return Promise.all([
      this.loadLogForSpecificInstance(client, appId, instanceName, dateFrom),
      client.application.detail(appId)
    ]).then(([log, app]) => {
      return { log, app: app.data };
    });
  }

  private async loadLogForSpecificInstance(
    client: Client,
    appId: string,
    instanceName: string,
    dateFrom?: string
  ): Promise<IMicroserviceLog> {
    const endpoint = `/application/applications/${appId}/logs/${instanceName}${
      dateFrom ? `?dateFrom=${dateFrom}` : ''
    }`;
    const logResponse = await client.core.fetch(endpoint, {
      headers: { Accept: 'application/vnd.com.nsn.cumulocity.applicationLogs+json;charset=UTF-8;ver=0.9' }
    } as RequestInit);
    if (logResponse.status !== 200) {
      throw Error('Failed');
    }
    const json: IMicroserviceLog = await logResponse.json();
    json.instanceName = instanceName;
    return json;
  }

  async downloadLogFile(tenantId: string, appId: string, instanceName: string): Promise<void> {
    const client = await this.credService.getClientForTenant(tenantId);
    const dateFrom = new Date(0).toISOString();
    const log = await this.loadLogForSpecificInstance(client, appId, instanceName, dateFrom);
    const logText = log.logs;
    const blob = new File([logText], `${instanceName}.log`, { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    window.open(url);
  }
}
