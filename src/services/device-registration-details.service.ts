import { Injectable } from '@angular/core';
import { Client, IDeviceRegistration, IDeviceRegistrationCreate, IResult } from '@c8y/client';
import { TenantSpecificDetails } from '@models/tenant-specific-details';

@Injectable({
  providedIn: 'root'
})
export class DeviceRegistrationDetailsService {
  public async createRegistrationRequest(
    client: Client,
    registration: IDeviceRegistrationCreate,
    autoAccept = false
  ): Promise<IResult<IDeviceRegistration>> {
    const request = await client.deviceRegistration.create(registration);
    if (autoAccept) {
      try {
        return await this.acceptRegistrationRequest(client, registration.id);
      } catch (e) {
        throw Error('Failed to auto-accept registration request.');
      }
    }
    return request;
  }

  public acceptRegistrationRequest(client: Client, id: string): Promise<IResult<IDeviceRegistration>> {
    return client.deviceRegistration.accept(id);
  }

  public async rejectRegistrationRequest(client: Client, id: string): Promise<void> {
    await client.deviceRegistration.delete(id);
  }

  public async getRegistrationRequestsOfTennat(client: Client): Promise<TenantSpecificDetails<IDeviceRegistration>[]> {
    const resArr = new Array<TenantSpecificDetails<IDeviceRegistration>>();
    const filter = {
      pageSize: 1000
    };
    let result = await client.deviceRegistration.list(filter);
    while (result.data.length) {
      const tenantSpecific: TenantSpecificDetails<IDeviceRegistration>[] = result.data.map((tmp) => {
        return { data: tmp, tenantId: client.core.tenant };
      });
      resArr.push(...tenantSpecific);
      if (result.data.length < filter.pageSize) {
        break;
      }
      result = await result.paging.next();
    }
    return resArr;
  }

  public getRegistrationRequests(clients: Client[]): Promise<TenantSpecificDetails<IDeviceRegistration>[]> {
    const promArray = clients.map((client) => this.getRegistrationRequestsOfTennat(client));
    return Promise.all(promArray).then((result) => {
      const resArr = new Array<TenantSpecificDetails<IDeviceRegistration>>();
      result.forEach((tmp) => resArr.push(...tmp));
      return resArr;
    });
  }
}
