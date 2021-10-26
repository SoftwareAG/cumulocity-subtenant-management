import { Injectable } from '@angular/core';
import { Client, IApplication, IManagedObject } from '@c8y/client';
import { IMicroserviceLog } from '@models/microservice-log';
import { FakeMicroserviceService } from '@services/fake-microservice.service';

@Injectable({
  providedIn: 'root'
})
export class MicroserviceLogsService {
  constructor(private credService: FakeMicroserviceService) {}

  async loadLog(appId: string, tenantId: string): Promise<{ app: IApplication; logs: IMicroserviceLog[] }> {
    const client = await this.credService.getClientForTenant(tenantId);

    const { data: app } = await client.application.detail(appId);

    const { data: instanceDetails } = await client.inventory.list({ type: `c8y_Application_${app.id}` });
    let logs: IMicroserviceLog[] = [];
    if (instanceDetails.length) {
      const instanceDetail = instanceDetails[0];
      logs = await this.loadLogsFromInstanceDetails(client, appId, instanceDetail);
    }

    return { app, logs };
  }

  private async loadLogsFromInstanceDetails(
    client: Client,
    appId: string,
    instanceDetails: IManagedObject
  ): Promise<IMicroserviceLog[]> {
    if (instanceDetails.c8y_Status && instanceDetails.c8y_Status.instances) {
      const instances = Object.keys(instanceDetails.c8y_Status.instances);
      const logs = await Promise.all(
        instances.map((instanceName) => this.loadLogsForSpecificInstance(client, appId, instanceName))
      );
      return logs;
    }
    return [];
  }

  private async loadLogsForSpecificInstance(
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
    const json: IMicroserviceLog = await logResponse.json();
    json.instanceName = instanceName;
    return json;
  }

  async downloadLogFile(tenantId: string, appId: string, instanceName: string): Promise<void> {
    const client = await this.credService.getClientForTenant(tenantId);
    const dateFrom = new Date(0).toISOString();
    const log = await this.loadLogsForSpecificInstance(client, appId, instanceName, dateFrom);
    const logText = log.logs;
    const blob = new File([logText], `${instanceName}.log`, { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    window.open(url);
  }
}
