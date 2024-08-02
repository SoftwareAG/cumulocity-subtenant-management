import { Injectable } from '@angular/core';
import { Client, IManagedObject } from '@c8y/client';
import { TenantSpecificDetails } from '@models/tenant-specific-details';

@Injectable({
  providedIn: 'root'
})
export class DeviceDetailsService {
  public async getFirmwareStatistics(client: Client, firmware: IManagedObject): Promise<Map<string, number>> {
    const firmwareCounterMap = new Map<string, number>();
    const filter = {
      q: `$filter=(c8y_Firmware.name eq '` + firmware.name + `' )`,
      pageSize: 2000
    };
    try {
      const res = await client.inventory.list(filter);
      console.log(res);
      res.data.forEach((mo) => {
        if (mo && mo.type && mo.c8y_Firmware && mo.c8y_Firmware.name && mo.c8y_Firmware.version) {
          const version = mo.c8y_Firmware.version;
          if (firmwareCounterMap.has(version)) {
            const count = firmwareCounterMap.get(version);
            firmwareCounterMap.set(version, count + 1);
          } else {
            firmwareCounterMap.set(version, 1);
          }
        }
      });
    } catch (e) {
      console.error(e);
    }

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
