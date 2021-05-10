import { Injectable } from '@angular/core';
import { Client, IManagedObject, InventoryBinaryService, InventoryService } from '@c8y/client';
import { cloneDeep } from 'lodash-es';

@Injectable({
  providedIn: 'root'
})
export class ProvisioningService {
  defaultMoAttributesToRemove = [
    'additionParents', 'childDevices', 'childAssets', 'creationTime', 'lastUpdated', 'childAdditions', 'deviceParents', 'assetParents', 'self', 'id'
  ];
  provisioningIdent = 'c8y_SubtenantManagementProvisioning';

  constructor(
    private inventoryService: InventoryService,
    private binaryService: InventoryBinaryService
  ) { }

  createCopyOfManagedObject(originalMO: IManagedObject, provisioningDetails: any = {}) {
    const copy = cloneDeep(originalMO);
    Object.keys(copy).forEach(entry => {
      if (this.defaultMoAttributesToRemove.includes(entry)) {
        delete copy[entry];
      }
    });
    copy[this.provisioningIdent] = provisioningDetails || {};
    return copy;
  }

  async provisionLegacyFirmwareToTenants(clients: Client[], firmware: IManagedObject) {
    const url = (firmware.url as string) || '';
    if (url && url.includes('/inventory/binaries/')) {
      const binaryMOId = this.binaryService.getIdFromUrl(url);
      const {data: binaryMO} = await this.inventoryService.detail(binaryMOId);
      const binaryResponse = (await this.binaryService.download(binaryMOId)) as Response;
      const binary = await binaryResponse.blob();
      return await Promise.all(clients.map(tmp => this.provisionLegacyFirmwareToTenant(tmp, firmware, binaryMO, binary)));
    } else {
      return await Promise.all(clients.map(tmp => this.provisionLegacyFirmwareToTenant(tmp, firmware)));
    }
  }

  async provisionLegacyFirmwareToTenant(client: Client, firmware: IManagedObject, binaryMO?: IManagedObject, binary?: Blob) {
    const knownFirmware = await this.checkIfFirmwareIsAvailable(client, firmware);
    if (!knownFirmware) {
      const newFirmwareMO = this.createCopyOfManagedObject(firmware);
      newFirmwareMO[this.provisioningIdent].firmwareMOId = firmware.id;
      if (binaryMO && binary) {
        const newBinaryMO = await client.inventoryBinary.create(binary, this.createCopyOfManagedObject(binaryMO));
        newFirmwareMO.url = newBinaryMO.data.self;
      }
      const res = await client.inventory.create(newFirmwareMO);
      return res;
    }
    return null;
  }

  async checkIfFirmwareIsAvailable(client: Client, firmware: IManagedObject) {
    const filter = {
      query: `$filter=((type eq 'c8y_Firmware') and (name eq '${firmware.name}') and (version eq '${firmware.version}') and has(${this.provisioningIdent}) and (${this.provisioningIdent}.firmwareMOId eq '${firmware.id}'))`
    };
    const { data: firmwares } = await client.inventory.list(filter);
    return firmwares.length > 0 ? firmwares[0] : null;
  }

  async deprovisionLegacyFirmwareFromTenants(clients: Client[], firmware: IManagedObject) {
    return await Promise.all(clients.map(tmp => this.deprovisionLegacyFirmwareFromTenant(tmp, firmware)));
  }

  async deprovisionLegacyFirmwareFromTenant(client: Client, firmware: IManagedObject) {
    const findFirmware = await this.checkIfFirmwareIsAvailable(client, firmware);
    if (findFirmware) {
      const url = findFirmware.url as string;
      if (url && url.includes('/inventory/binaries/')) {
        const binaryMOId = this.binaryService.getIdFromUrl(url);
        await client.inventoryBinary.delete(binaryMOId);
      }
      await client.inventory.delete(findFirmware.id);
    }
  }

}
