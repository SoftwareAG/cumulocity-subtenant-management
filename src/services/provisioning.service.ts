import { Injectable } from '@angular/core';
import {
  Client,
  IApplication,
  IdentityService,
  IExternalIdentity,
  IManagedObject,
  InventoryBinaryService,
  InventoryService,
  IResult,
  IRole,
  ITenantOption,
  IUserGroup,
  UserGroupService
} from '@c8y/client';
import { cloneDeep } from 'lodash-es';
import { v4 as uuidv4 } from 'uuid';

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
    private identityService: IdentityService,
    private userGroupService: UserGroupService
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

  async removeUserGroupFromTenants(clients: Client[], userGroup: IUserGroup): Promise<void> {
    if (userGroup && userGroup.customProperties && userGroup.customProperties.uuid) {
      const uuid: string = userGroup.customProperties.uuid;
      const promArray = clients.map((client) => this.removeUserGroupFromTenant(client, uuid));
      await Promise.all(promArray);
    } else {
      throw 'No uuid available for this group';
    }
  }

  async removeUserGroupFromTenant(client: Client, uuid: string): Promise<void> {
    const foundUserGroup = await this.getUserGroupMatchingId(client, uuid);
    if (foundUserGroup) {
      await client.userGroup.delete(foundUserGroup);
    }
  }

  async provisionUserGroupToTenants(clients: Client[], userGroup: IUserGroup): Promise<void[]> {
    let uniqueId = '';
    let userGroupForRollout = userGroup;
    if (userGroup.customProperties || userGroup.customProperties.uuid) {
      uniqueId = userGroup.customProperties.uuid;
    } else {
      uniqueId = uuidv4();
      if (!userGroup.customProperties) {
        userGroup.customProperties = {};
      }
      userGroup.customProperties.uuid = uniqueId;
      const result = await this.userGroupService.update(userGroup);
      userGroupForRollout = result.data;
    }
    const promArray = clients.map((client) => this.provisionUserGroupToTenant(client, userGroupForRollout, uniqueId));
    return Promise.all(promArray);
  }

  async provisionUserGroupToTenant(client: Client, userGroup: IUserGroup, uuid: string): Promise<void> {
    const { '0': availableApps, '1': availableRoles } = await Promise.all([
      this.getAllApps(client),
      this.getAllRoles(client)
    ]);

    const appList = userGroup.applications.filter((tmp) => availableApps.some((entry) => entry.id === tmp.id));

    let foundUserGroup = await this.getUserGroupMatchingId(client, uuid);
    if (!foundUserGroup) {
      const res = await client.userGroup.create({
        name: userGroup.name,
        description: userGroup.description,
        customProperties: userGroup.customProperties,
        applications: appList
      });
      foundUserGroup = res.data;
    } else {
      // update app list
      const someAppIsMissing = appList.some((tmp) => !foundUserGroup.applications.some((entry) => entry.id === tmp.id));
      const someAppTooMuch = foundUserGroup.applications.some((tmp) => !appList.some((entry) => entry.id === tmp.id));
      if (someAppIsMissing || someAppTooMuch) {
        foundUserGroup.applications = appList;
        const res = await client.userGroup.update(foundUserGroup);
        foundUserGroup = res.data;
      }
    }

    const promArray = new Array<Promise<any>>();
    // assign roles
    const missingRoles = userGroup.roles.references.filter(
      (tmp) => !foundUserGroup.roles.references.some((entry) => entry.role.id === tmp.role.id)
    );
    promArray.push(
      ...missingRoles
        .filter((tmp) => availableRoles.some((entry) => entry.id === tmp.role.id))
        .map((tmp) => client.userGroup.addRoleToGroup(foundUserGroup.id, tmp.role).catch(() => null))
    );

    // removing roles
    const tooManyRoles = foundUserGroup.roles.references.filter(
      (tmp) => !userGroup.roles.references.some((entry) => entry.role.id === tmp.role.id)
    );
    promArray.push(
      ...tooManyRoles.map((tmp) => client.userGroup.removeRoleFromGroup(foundUserGroup.id, tmp.role).catch(() => null))
    );

    await Promise.all(promArray);
  }

  async getAllApps(client: Client): Promise<IApplication[]> {
    const arr = new Array<IApplication>();
    const filter = {
      pageSize: 1000
    };
    let res = await client.application.list(filter);
    while (res.data.length) {
      arr.push(...res.data);
      if (res.data.length < res.paging.pageSize) {
        break;
      }
      res = await res.paging.next();
    }
    return arr;
  }

  async getAllRoles(client: Client): Promise<IRole[]> {
    const arr = new Array<IRole>();
    const filter = {
      pageSize: 1000
    };
    let res = await client.userRole.list(filter);
    while (res.data.length) {
      arr.push(...res.data);
      if (res.data.length < res.paging.pageSize) {
        break;
      }
      res = await res.paging.next();
    }
    return arr;
  }

  async getUserGroupMatchingId(client: Client, uuid: string): Promise<IUserGroup | null> {
    const filter = {
      pageSize: 100
    };
    let res = await client.userGroup.list(filter);
    while (res.data.length) {
      const foundGroup = res.data.find((tmp) => tmp.customProperties && tmp.customProperties.uuid === uuid);
      if (foundGroup) {
        return foundGroup;
      }
      if (res.data.length < res.paging.pageSize) {
        break;
      }
      res = await res.paging.next();
    }
    return null;
  }

  async getSmartGroupMatchingId(client: Client, uuid: string): Promise<IManagedObject | null> {
    const filter = {
      pageSize: 1,
      query: `uuid eq '${uuid}'`
    };
    const moList = await client.inventory.list(filter);
    if (moList.data.length) {
      const mo = moList.data[0];
      return mo;
    }
    return null;
  }

  async provisionSmartGroupToTenants(clients: Client[], group: IManagedObject): Promise<void[]> {
    let uniqueId = '';
    if (group.uuid) {
      uniqueId = group.uuid;
    } else {
      uniqueId = uuidv4();
      group.uuid = uniqueId;
      await this.inventoryService.update({ id: group.id, uuid: uniqueId });
    }
    const partialGroup: Partial<IManagedObject> = {
      name: group.name,
      uuid: uniqueId,
      type: group.type,
      c8y_DeviceQueryString: group.c8y_DeviceQueryString,
      c8y_IsDynamicGroup: group.c8y_IsDynamicGroup,
      c8y_UIDeviceColumnsMeta: group.c8y_UIDeviceColumnsMeta,
      c8y_UIDeviceFilterConfig: group.c8y_UIDeviceFilterConfig
    };
    const promArray = clients.map((client) => this.provisionSmartGroupToTenant(client, partialGroup, uniqueId));
    return Promise.all(promArray);
  }

  async provisionSmartGroupToTenant(client: Client, group: Partial<IManagedObject>, uuid: string): Promise<void> {
    const mo = await this.getSmartGroupMatchingId(client, uuid);
    if (mo) {
      await client.inventory.update(Object.assign({ id: mo.id }, group));
    } else {
      await client.inventory.create(group);
    }
  }

  async removeSmartGroupFromTenants(clients: Client[], group: IManagedObject): Promise<void> {
    if (group.uuid) {
      const uuid: string = group.uuid;
      const promArray = clients.map((client) => this.removeSmartGroupFromTenant(client, uuid));
      await Promise.all(promArray);
    } else {
      throw 'No uuid available for this group';
    }
  }

  async removeSmartGroupFromTenant(client: Client, uuid: string): Promise<void> {
    const foundGroup = await this.getSmartGroupMatchingId(client, uuid);
    if (foundGroup) {
      await client.inventory.delete(foundGroup);
    }
  }
}
