import { Injectable } from '@angular/core';
import { Client, IManagedObject } from '@c8y/client';
import { TenantSpecificDetails } from '@models/tenant-specific-details';

@Injectable({
  providedIn: 'root'
})
export class DeviceDetailsService {
  public async getFirmwareStatistics(client: Client): Promise<Map<string, number>> {
    const firmwareCounterMap = new Map<string, number>();
    const filter = {
      q: '$filter=(has(c8y_Firmware))',
      pageSize: 2000
    };
    try {
      let res = await client.inventory.list(filter);
      while (res.data.length > 0) {
        res.data.forEach((mo) => {
          if (mo && mo.c8y_Firmware && mo.c8y_Firmware.name && mo.c8y_Firmware.version) {
            const name = mo.c8y_Firmware.name;
            const version = mo.c8y_Firmware.version;
            const firmwareIdent = `${name} - ${version}`;
            let currentCount = firmwareCounterMap.get(firmwareIdent);
            if (!currentCount) {
              currentCount = 1;
            } else {
              currentCount++;
            }
            firmwareCounterMap.set(firmwareIdent, currentCount);
          }
        });
        if (res.data.length < filter.pageSize) {
          break;
        }
        res = await res.paging.next(filter);
      }
    } catch (e) {}

    return firmwareCounterMap;
  }

  public async getFirmwareStatisticsOfTenants(clients: Client[]): Promise<Map<string, number>> {
    const firmwareCounterMap = new Map<string, number>();
    const promArray = clients.map((client) => this.getFirmwareStatistics(client));
    await Promise.all(promArray).then((resArr) => {
      resArr.forEach((tmp) => {
        tmp.forEach((value, key) => {
          let currentCount = firmwareCounterMap.get(key);
          if (currentCount) {
            currentCount = currentCount + value;
          } else {
            currentCount = value;
          }
          firmwareCounterMap.set(key, currentCount);
        });
      });
    });
    return firmwareCounterMap;
  }

  private async deviceLookupForTenant(client: Client, query: string) {
    const deviceArr = new Array<TenantSpecificDetails<Partial<IManagedObject>>>();
    const filter = {
      query,
      pageSize: 2000
    };
    let res = await client.inventory.list(filter);
    while (res.data.length > 0) {
      const devices = res.data.map((tmp) => {
        const operations = {};
        if (
          tmp.c8y_SupportedOperations &&
          tmp.c8y_SupportedOperations.length &&
          Array.isArray(tmp.c8y_SupportedOperations)
        ) {
          const supportedOperations: string[] = tmp.c8y_SupportedOperations;
          supportedOperations.forEach((operation) => {
            operations[operation] = {};
          });
        }
        return {
          // only process the actual displayed values to save memory in case of a lot and/or large managed objects
          data: {
            id: tmp.id,
            name: tmp.name,
            type: tmp.type,
            creationTime: tmp.creationTime,
            lastUpdated: tmp.lastUpdated,
            c8y_Mobile: tmp.c8y_Mobile,
            c8y_Firmware: tmp.c8y_Firmware,
            c8y_Availability: tmp.c8y_Availability,
            c8y_RequiredAvailability: tmp.c8y_RequiredAvailability,
            c8y_ActiveAlarmsStatus: tmp.c8y_ActiveAlarmsStatus,
            c8y_Connection: tmp.c8y_Connection,
            c8y_Configuration: tmp.c8y_Configuration,
            operations
          },
          tenantId: client.core.tenant
        } as TenantSpecificDetails<Partial<IManagedObject>>;
      });
      deviceArr.push(...devices);
      if (res.data.length < filter.pageSize) {
        break;
      }
      res = await res.paging.next(filter);
    }
    return deviceArr;
  }

  public async deviceLookup(
    clients: Client[],
    query: string
  ): Promise<Array<TenantSpecificDetails<Partial<IManagedObject>>>> {
    const deviceDetailsArry = new Array<TenantSpecificDetails<Partial<IManagedObject>>>();
    const promArray = clients.map((client) => {
      return this.deviceLookupForTenant(client, query).then(
        (result) => result,
        () => [] as TenantSpecificDetails<Partial<IManagedObject>>[]
      );
    });
    await Promise.all(promArray).then((resArr) => {
      resArr.forEach((entry) => {
        deviceDetailsArry.push(...entry);
      });
    });
    return deviceDetailsArry;
  }

  public async countDevicesMatchingQuery(
    clients: Client[],
    query: string
  ): Promise<{ tenant: string; count: number }[]> {
    const promArray = clients.map((client) => {
      const filter = {
        query,
        pageSize: 1,
        withTotalPages: true
      };
      return client.inventory.list(filter).then(
        (result) => {
          return { tenant: client.core.tenant, count: result.paging.totalPages };
        },
        () => ({ tenant: client.core.tenant, count: 0 })
      );
    });
    return await Promise.all(promArray);
  }
}
