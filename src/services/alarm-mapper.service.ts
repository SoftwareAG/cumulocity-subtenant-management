import { Injectable } from '@angular/core';
import { Client, IAlarm, FetchClient, InventoryService, IManagedObject, ITenantOption, AlarmStatus } from '@c8y/client';
import { IAlarmMappingBuffer } from '@models/AlarmMappingBuffer';

@Injectable()
export class AlarmMapperService {
  private readonly alarmMappingInventoryIdent = 'c8y_AlarmMappingSave';
  private readonly mappingCategory = 'alarm.type.mapping';

  constructor(private inventory: InventoryService) {}

  public async getFilteredAlarmListFromTenants(clients: Client[]): Promise<IAlarmMappingBuffer[]> {
    const previousMapping = await this.getStoredAlarmMapping();
    const alarms = await this.getAllAlarmsOfTenants(clients);
    const mapping = this.filterDuplicateTypes(alarms, previousMapping);

    return mapping;
  }

  private getAllAlarmsOfTenants(clients: Client[]) {
    const promiseArray = clients.map((client) => {
      return client.alarm.list({ pageSize: 1000 }).then(
        (result) => result.data,
        () => [] as IAlarm[]
      );
    });
    return Promise.all(promiseArray).then((result) => {
      return result.reduce((prev, curr) => prev.concat(curr), []);
    });
  }

  private filterDuplicateTypes(alarms: IAlarm[], previousMapping: IAlarmMappingBuffer[]) {
    const alarmMap = new Map<string, IAlarmMappingBuffer>();

    alarms
      .filter((tmp) => !tmp.type.startsWith('c8y_Threshold'))
      // add newest values last to the map
      .sort((a, b) => a.creationTime.localeCompare(b.creationTime))
      .map((tmp) => {
        return {
          alarm: tmp,
          severity: tmp.severity,
          text: tmp.text,
          type: tmp.type
        } as IAlarmMappingBuffer;
      })
      .forEach((alarm) => {
        alarmMap.set(alarm.type, alarm);
      });

    previousMapping.forEach((alarm) => {
      const foundAlarmType = alarmMap.get(alarm.type);
      if (foundAlarmType) {
        alarm.alarm = foundAlarmType.alarm;
      }
      alarmMap.set(alarm.type, alarm);
    });
    return Array.from(alarmMap.values()).sort((a, b) => a.type.localeCompare(b.type));
  }

  private getAlarmMappingTenantOptions(alarms: IAlarmMappingBuffer[]) {
    const enabledAlarms = alarms.filter((tmp) => tmp.enabled);
    const mappedAlarms = enabledAlarms.map((tmp) => {
      return { key: tmp.type, category: this.mappingCategory, value: `${tmp.severity}|${tmp.text}` } as ITenantOption;
    });
    return mappedAlarms;
  }

  public createMapping(alarms: IAlarmMappingBuffer[]): {
    [key: string]: string;
  } {
    const mappedAlarms = this.getAlarmMappingTenantOptions(alarms);
    const mapping: { [key: string]: string } = {};
    mappedAlarms.forEach((tmp) => {
      mapping[tmp.key] = tmp.value;
    });
    return mapping;
  }

  public async storeAlarmMappingOnTenants(alarms: IAlarmMappingBuffer[], clients: Client[]): Promise<void[]> {
    const mapping = this.createMapping(alarms);
    const tenantOptions = this.getAlarmMappingTenantOptions(alarms);
    await this.storeAlarmMappingInTenantPolicy(tenantOptions);
    const promiseArray = clients.map((client) => {
      return this.storeAlarmMapping(client.core, mapping).catch();
    });
    return Promise.all(promiseArray);
  }

  private storeAlarmMapping(client: FetchClient, mapping: { [key: string]: string }) {
    const url = `/tenant/options/${this.mappingCategory}`;
    const options: RequestInit = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mapping)
    };
    return client.fetch(url, options).then((result) => {
      if (result.status === 200) {
        return;
      }
      return Promise.reject(result.status);
    });
  }

  private async storeAlarmMappingInTenantPolicy(alarmMapping: ITenantOption[]) {
    const { data: policies } = await this.inventory.list({
      type: 'c8y_TenantPolicy'
    });
    if (policies.length) {
      const policy: { options?: ITenantOption[]; id: string } = policies[0] as any;
      if (!policy.options || !(policy.options instanceof Array)) {
        policy.options = [];
      }
      policy.options = policy.options.filter((tmp) => tmp.category !== this.mappingCategory);
      policy.options = policy.options.concat(alarmMapping);
      await this.inventory.update({
        id: policy.id,
        options: policy.options
      });
    }
  }

  private getStoredAlarmMapping(): Promise<IAlarmMappingBuffer[]> {
    return this.findStoredAlarmMapping().then((result) => {
      if (result.length) {
        const mo = result[0];
        if (mo[this.alarmMappingInventoryIdent] instanceof Array) {
          return mo[this.alarmMappingInventoryIdent];
        }
      }
      return [] as IAlarmMappingBuffer[];
    });
  }

  private findStoredAlarmMapping(): Promise<IManagedObject[]> {
    return this.inventory
      .list({
        pageSize: 1,
        fragmentType: this.alarmMappingInventoryIdent
      })
      .then((result) => {
        return result.data;
      });
  }

  public async storeAlarmMappingForLaterUse(mapping: IAlarmMappingBuffer[]): Promise<void> {
    const mappingCopy = mapping.map((tmp) => {
      const copyOfMapping = Object.assign({}, tmp);
      copyOfMapping.alarm = {
        creationTime: copyOfMapping.alarm.creationTime,
        text: copyOfMapping.alarm.text,
        severity: copyOfMapping.alarm.severity,
        source: copyOfMapping.alarm.source
      };
      return copyOfMapping;
    });
    const existingSave = await this.findStoredAlarmMapping();
    if (existingSave.length) {
      const mo = existingSave[0];
      await this.inventory.update({
        id: mo.id,
        [this.alarmMappingInventoryIdent]: mappingCopy
      });
      return;
    } else {
      await this.inventory.create({
        [this.alarmMappingInventoryIdent]: mappingCopy
      });
      return;
    }
  }

  public removeExitsingAlarmMappingFromAllTenants(clients: Client[]): Promise<void[]> {
    const promiseArray = clients.map((client) => {
      return this.removeAlarmMappingsFromTenants(client).catch();
    });
    return Promise.all(promiseArray);
  }

  private async removeAlarmMappingsFromTenants(client: Client) {
    const url = `/tenant/options/${this.mappingCategory}`;
    const mapping = await client.core.fetch(url).then((result) => {
      if (result.status === 200) {
        return result.json();
      } else {
        return {};
      }
    });
    const promArray = Object.keys(mapping).map((key) =>
      client.options.tenant.delete({ category: this.mappingCategory, key }).catch()
    );
    await Promise.all(promArray);
  }
}
