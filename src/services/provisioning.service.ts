import { Injectable } from '@angular/core';
import {
  Client,
  IdentityService,
  IExternalIdentity,
  IManagedObject,
  InventoryBinaryService,
  InventoryService,
  IResult,
  ITenantOption
} from '@c8y/client';
import { cloneDeep } from 'lodash-es';

@Injectable({
  providedIn: 'root'
})
export class ProvisioningService {
  defaultMoAttributesToRemove = [
    'additionParents',
    'childDevices',
    'childAssets',
    'creationTime',
    'lastUpdated',
    'childAdditions',
    'deviceParents',
    'assetParents',
    'self',
    'id'
  ];
  provisioningIdent = 'c8y_SubtenantManagementProvisioning';

  constructor(
    private inventoryService: InventoryService,
    private binaryService: InventoryBinaryService,
    private identityService: IdentityService
  ) {}

  createCopyOfManagedObject(originalMO: IManagedObject, provisioningDetails: any = {}): IManagedObject {
    const copy = cloneDeep(originalMO);
    Object.keys(copy).forEach((entry) => {
      if (this.defaultMoAttributesToRemove.includes(entry)) {
        delete copy[entry];
      }
    });
    copy[this.provisioningIdent] = provisioningDetails || {};
    return copy;
  }

  async provisionLegacyFirmwareToTenants(clients: Client[], firmware: IManagedObject): Promise<IManagedObject[]> {
    const url = (firmware.url as string) || '';
    if (url && url.includes('/inventory/binaries/')) {
      const binaryMOId = this.binaryService.getIdFromUrl(url);
      const { data: binaryMO } = await this.inventoryService.detail(binaryMOId);
      const binaryResponse = (await this.binaryService.download(binaryMOId)) as Response;
      const binary = await binaryResponse.blob();
      return await Promise.all(
        clients.map((tmp) => this.provisionLegacyFirmwareToTenant(tmp, firmware, binaryMO, binary))
      );
    } else {
      return await Promise.all(clients.map((tmp) => this.provisionLegacyFirmwareToTenant(tmp, firmware)));
    }
  }

  async provisionLegacyFirmwareToTenant(
    client: Client,
    firmware: IManagedObject,
    binaryMO?: IManagedObject,
    binary?: Blob
  ): Promise<IManagedObject> {
    const knownFirmware = await this.checkIfFirmwareIsAvailable(client, firmware);
    if (!knownFirmware) {
      const newFirmwareMO = this.createCopyOfManagedObject(firmware);
      newFirmwareMO[this.provisioningIdent].firmwareMOId = firmware.id;
      if (binaryMO && binary) {
        const newBinaryMO = await client.inventoryBinary.create(binary, this.createCopyOfManagedObject(binaryMO));
        newFirmwareMO.url = newBinaryMO.data.self;
      }
      const res = await client.inventory.create(newFirmwareMO);
      return res.data;
    }
    return null;
  }

  async checkIfFirmwareIsAvailable(client: Client, firmware: IManagedObject): Promise<IManagedObject> {
    const filter = {
      query: `$filter=((type eq 'c8y_Firmware') and (name eq '${firmware.name}') and (version eq '${firmware.version}') and has(${this.provisioningIdent}) and (${this.provisioningIdent}.firmwareMOId eq '${firmware.id}'))`
    };
    const { data: firmwares } = await client.inventory.list(filter);
    return firmwares.length > 0 ? firmwares[0] : null;
  }

  async deprovisionLegacyFirmwareFromTenants(clients: Client[], firmware: IManagedObject): Promise<void[]> {
    return await Promise.all(clients.map((tmp) => this.deprovisionLegacyFirmwareFromTenant(tmp, firmware)));
  }

  async deprovisionLegacyFirmwareFromTenant(client: Client, firmware: IManagedObject): Promise<void> {
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

  async provisionSmartRESTTemplates(clients: Client[], templateIds: string[]): Promise<void> {
    const promArray = templateIds.map((tmp) => this.provisionSmartRESTTemplate(clients, tmp));
    await Promise.all(promArray);
  }

  async provisionSmartRESTTemplate(clients: Client[], templateId: string): Promise<void> {
    const { data: template } = await this.inventoryService.detail(templateId);
    const { data: externalIds } = await this.identityService.list(templateId);
    const keysToRemove = [
      'additionParents',
      'assetParents',
      'childAdditions',
      'childAssets',
      'childDevices',
      'creationTime',
      'deviceParents',
      'owner',
      'self',
      'id'
    ];
    Object.keys(template).forEach((key) => {
      if (keysToRemove.includes(key)) {
        delete template[key];
      }
    });
    // filter for just SmartREST2 and SmartREST1 externalId types
    const filteredExternalId = externalIds.find(
      (tmp) => tmp.type === 'c8y_SmartRest2DeviceIdentifier' || tmp.type === 'c8y_SmartRestDeviceIdentifier'
    );
    if (!filteredExternalId) {
      throw 'No externalId available for Template.';
    }
    const promArray = clients.map((client) =>
      this.provisionSmartRESTTemplateForTenant(client, template, filteredExternalId)
    );
    await Promise.all(promArray);
  }

  async provisionSmartRESTTemplateForTenant(
    client: Client,
    template: Partial<IManagedObject>,
    externalId: IExternalIdentity
  ): Promise<void> {
    const externalIdDetails = await client.identity
      .detail({ externalId: externalId.externalId, type: externalId.type })
      .then(
        (result) => {
          return result.data;
        },
        () => {
          return null as IExternalIdentity;
        }
      );
    const templateCopy = Object.assign({}, template);
    if (externalIdDetails) {
      templateCopy.id = externalIdDetails.managedObject.id as string;
      await client.inventory.update(templateCopy);
    } else {
      const { data: createdTemplate } = await client.inventory.create(templateCopy);
      await client.identity.create({
        externalId: externalId.externalId,
        type: externalId.type,
        managedObject: { id: createdTemplate.id }
      });
    }
  }

  provisionTenantOptionToTenants(clients: Client[], tenantOption: ITenantOption): Promise<IResult<ITenantOption>[]> {
    const promArray = clients.map((client) => client.options.tenant.update(tenantOption));
    return Promise.all(promArray);
  }
}
