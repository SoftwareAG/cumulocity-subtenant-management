import { Injectable } from '@angular/core';
import { Client, IManagedObject } from '@c8y/client';
import { TenantSpecificDetails } from '@models/tenant-specific-details';

@Injectable({
  providedIn: 'root'
})
export class DeviceDetailsService {
  public async getFirmwareStatistics(client: Client): Promise<Map<string, Map<string, number>>> {
    const firmwareCounterMap = new Map<string, Map<string, number>>();
    const filter = {
      q: '$filter=(has(c8y_Firmware))',
      pageSize: 2000
    };
    try {
      let res = await client.inventory.list(filter);
      while (res.data.length > 0) {
        res.data.forEach((mo) => {
          if (mo && mo.type && mo.c8y_Firmware && mo.c8y_Firmware.name && mo.c8y_Firmware.version) {
            const name = mo.c8y_Firmware.name;
            const version = mo.c8y_Firmware.version;
            const firmwareIdent = `${version}`;
            const type = mo.type;
            const deviceIdent = `${type} - ${name}`;
            let currentDeviceType = firmwareCounterMap.get(deviceIdent);
            if (!currentDeviceType) {
              currentDeviceType = new Map<string, number>();
              currentDeviceType.set(firmwareIdent, 1);
              firmwareCounterMap.set(deviceIdent, currentDeviceType);
            } else {
              const currentCount = currentDeviceType.get(firmwareIdent);
              if (!currentCount) {
                currentDeviceType.set(firmwareIdent, 1);
              } else {
                currentDeviceType.set(firmwareIdent, currentCount + 1);
              }
            }
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

  public async getFirmwareStatisticsOfTenants(clients: Client[]): Promise<Map<string, Map<string, number>>> {
    const firmwareCounterMap = new Map<string, Map<string, number>>();
    const promArray = clients.map((client) => this.getFirmwareStatistics(client));
    await Promise.all(promArray).then((resArr) => {
      resArr.forEach((tmp) => {
        tmp.forEach((value, key) => {
          let currentDeviceType = firmwareCounterMap.get(key);
          if (!currentDeviceType) {
            currentDeviceType = new Map<string, number>();
            firmwareCounterMap.set(key, currentDeviceType);
          }
          value.forEach((entry, key2) => {
            let currentCount = currentDeviceType.get(key2);
            if (currentCount) {
              currentCount = currentCount + entry;
            } else {
              currentCount = entry;
            }
            currentDeviceType.set(key2, currentCount);
          });
        });
      });
    });
    return firmwareCounterMap;
  }

  private async deviceLookupForTenant(client: Client, query: string) {
    const deviceArr = new Array<TenantSpecificDetails<IManagedObject>>();
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
          data: tmp,
          actions: [],
          operations,
          tenantId: client.core.tenant,
          id: { tenant: client.core.tenant, id: tmp.id }
        } as TenantSpecificDetails<IManagedObject>;
      });
      deviceArr.push(...devices);
      if (res.data.length < filter.pageSize) {
        break;
      }
      res = await res.paging.next(filter);
    }
    return deviceArr;
  }

  public async deviceLookup(clients: Client[], query: string): Promise<Array<TenantSpecificDetails<IManagedObject>>> {
    const deviceDetailsArry = new Array<TenantSpecificDetails<IManagedObject>>();
    const promArray = clients.map((client) => {
      return this.deviceLookupForTenant(client, query).then(
        (result) => result,
        () => [] as TenantSpecificDetails<IManagedObject>[]
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
