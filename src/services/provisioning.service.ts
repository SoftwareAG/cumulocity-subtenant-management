import { Injectable } from '@angular/core';
import {
  Client,
  IApplication,
  IdentityService,
  IExternalIdentity,
  IManagedObject,
  InventoryBinaryService,
  InventoryService,
  IOperationBulk,
  IResult,
  IRole,
  ITenantOption,
  IUserGroup,
  UserGroupService
} from '@c8y/client';
import { IOperation } from '@modules/provisioning/firmware-provisioning/models/operation.model';
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

  async checkIfFirmwareIsAvailable(client: Client, firmware: IManagedObject): Promise<IManagedObject> {
    const filter = {
      query: `$filter=((type eq 'c8y_Firmware') and (name eq '${firmware.name}') and has(${this.provisioningIdent}) and (${this.provisioningIdent}.firmwareMOId eq '${firmware.id}'))`
    };
    const { data: firmwares } = await client.inventory.list(filter);
    return firmwares.length > 0 ? firmwares[0] : null;
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

  deprovisionTenantOptionToTenants(clients: Client[], tenantOption: ITenantOption): Promise<IResult<ITenantOption>[]> {
    const promArray = clients.map((client) => client.options.tenant.delete(tenantOption));
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

  /**
   * ScheduleBulkFirmwareUpgrade schedules a bulk firmware upgrade on the given client
   * @param client
   * @param operationDetails
   * @param groupId
   * @param firmware
   * @param firmwareVersion
   * @returns the output of the bulk operation
   */
  async scheduleBulkFirmwareUpgrade(
    client: Client,
    operationDetails: IOperation,
    firmware: IManagedObject,
    firmwareVersion: IManagedObject
  ): Promise<IOperationBulk> {
    // Create a dynamic group based on the firmware type
    const groupId = await this.createDynamicGroup(client, firmware.c8y_Filter.type);

    // If no group ID is returned, exit the function
    if (!groupId) {
      return;
    }

    // Define the bulk operation details
    const bulkOperation: IOperationBulk = {
      groupId: groupId,
      creationRamp: operationDetails.delay,
      startDate: operationDetails.date.toISOString(),
      note: operationDetails.description,
      operationPrototype: {
        c8y_Firmware: {
          name: firmware.name,
          version: firmwareVersion.c8y_Firmware.version,
          url: firmwareVersion.c8y_Firmware.url
        },
        description: firmware.description,
        inet_OperationType: 'AUTOMATIC_FIRMWARE_UPGRADE'
      }
    };

    // Create the bulk operation and get the output
    const { data: operationOutput } = await client.operationBulk.create(bulkOperation);

    return operationOutput;
  }

  /**
   * CheckIfAutomaticFirmwareUpgradeEnabled checks if automatic firmware upgrade is enabled for the given device query
   * @param client
   * @param deviceQuery
   * @returns boolean
   */
  async checkIfAutomaticFirmwareUpgradeEnabled(client: Client, deviceQuery: string): Promise<boolean> {
    const filter = {
      query: deviceQuery
    };
    const { data: devices } = await client.inventory.list(filter);
    return devices.length > 0;
  }
  /**
   * GetAutomaticFirmwareUpgradeGroups returns all groups with automatic firmware upgrade enabled
   * @param client
   * @returns group IDs
   */
  async getAutomaticFirmwareUpgradeGroups(client: Client): Promise<string[]> {
    const query = {
      __filter: {
        type: 'c8y_DeviceGroup',
        inet_AutomaticFirmwareUpgrade: true
      }
    };
    const filter = {
      currentPage: 1,
      pageSize: 2000
    };
    const { data: groups } = await client.inventory.listQuery(query, filter);
    return groups.length > 0 ? groups.map((group) => group.id) : [];
  }

  /**
   * CreateDynamicGroup creates a dynamic group on the given client
   * @param client
   * @returns the ID of the dynamic group
   */
  async createDynamicGroup(client: Client, deviceType: string): Promise<string> {
    // Retrieve the IDs of all device groups that are enabled for automatic firmware upgrades
    const groupIds = await this.getAutomaticFirmwareUpgradeGroups(client);

    // Construct the device query string based on the device type and whether there are any group IDs
    const deviceQuery =
      groupIds.length > 0
        ? `$filter=((type eq '${deviceType}') and ((inet_AutomaticFirmwareUpgrade eq true) or (bygroupid(${groupIds.join()}))))`
        : `$filter=((type eq '${deviceType}') and (inet_AutomaticFirmwareUpgrade eq true))`;

    // Check if automatic firmware upgrade is enabled for the device query
    const automaticFirmwareUpgradeEnabled = await this.checkIfAutomaticFirmwareUpgradeEnabled(client, deviceQuery);

    // If automatic firmware upgrade is not enabled, return an empty id
    if (!automaticFirmwareUpgradeEnabled) {
      return '';
    }

    // Define the dynamic group object
    const dynamicGroup = {
      name: 'Bulk Firmware Upgrade Group',
      type: 'c8y_DynamicGroup',
      c8y_IsDynamicGroup: { invisible: {} },
      c8y_DeviceQueryString: deviceQuery
    };

    // Create the dynamic group and get the output
    const { data: dynamicGroupMO } = await client.inventory.create(dynamicGroup);

    // Return the ID of the dynamic group
    return dynamicGroupMO.id;
  }

  /**
   * ProvisionLegacyFirmwareToTenant is used to create firmware and firmware versions for the given client
   * @param client
   * @param firmware
   * @param selectedVersion
   * @param binary
   * @param binaryMO
   * @returns
   */
  async provisionLegacyFirmwareToTenant(
    client: Client,
    firmware: IManagedObject,
    selectedVersion: IManagedObject,
    operationDetails: IOperation
  ): Promise<IManagedObject> {
    let isNewFirmware = false;
    // Check if firmware is already available if not available create it
    const knownFirmware = await this.checkIfFirmwareIsAvailable(client, firmware).then(async (res) => {
      if (!res) {
        // Create a new firmware managed object if the firmware is not available.
        const newFirmwareMO = this.createCopyOfManagedObject(firmware);
        newFirmwareMO[this.provisioningIdent].firmwareMOId = firmware.id;
        const res = await client.inventory.create(newFirmwareMO);
        isNewFirmware = true;
        return res.data;
      } else {
        // Update the firmware managed object if the firmware is available.
        const updateFirmwareMO = this.createCopyOfManagedObject(firmware);
        updateFirmwareMO[this.provisioningIdent].firmwareMOId = firmware.id;
        updateFirmwareMO.id = res.id;
        const updateResponse = await client.inventory.update(updateFirmwareMO);
        return updateResponse.data;
      }
    });

    let knownFirmwareVersion;

    if (isNewFirmware) {
      // If the firmware is new, create a new firmware version managed object.
      const newFirmwareVersionMO = this.createCopyOfManagedObject(selectedVersion);
      const res = await client.inventory.childAdditionsCreate(newFirmwareVersionMO, knownFirmware.id);
      knownFirmwareVersion = res.data;
    } else {
      // If the firmware is not new, check if the firmware version is available.
      knownFirmwareVersion = await this.checkIfFirmwareVersionIsAvailable(
        client,
        knownFirmware,
        selectedVersion.c8y_Firmware.version
      );

      if (!knownFirmwareVersion) {
        // If the firmware version is not available, create a new firmware version managed object.
        const newFirmwareVersionMO = this.createCopyOfManagedObject(selectedVersion);
        const res = await client.inventory.childAdditionsCreate(newFirmwareVersionMO, knownFirmware.id);
        knownFirmwareVersion = res.data;
      }
    }

    // create scheduled automatic bulk operation for automatic firmware enabled devices and groups
    await this.scheduleBulkFirmwareUpgrade(client, operationDetails, firmware, selectedVersion);

    return knownFirmwareVersion;
  }

  /**
   * CheckIfFirmwareVersionIsAvailable checks if the given firmware version is already available on the given client
   * @param client
   * @param firmware
   * @param version
   * @returns
   */
  async checkIfFirmwareVersionIsAvailable(
    client: Client,
    firmware: IManagedObject,
    version: string
  ): Promise<IManagedObject> {
    const query = {
      __filter: {
        __bygroupid: firmware.id,
        type: 'c8y_FirmwareBinary',
        'c8y_Firmware.version': version
      }
    };
    const { data: firmwares } = await client.inventory.listQuery(query);
    return firmwares.length > 0 ? firmwares[0] : null;
  }
  /**
   * ProvisionLegacyFirmwareToTenants is used to create firmware and firmware versions for the given clients
   * @param clients
   * @param firmware
   * @param selectedVersion
   * @returns
   */
  async provisionLegacyFirmwareToTenants(
    clients: Client[],
    firmware: IManagedObject,
    selectedVersion: IManagedObject,
    operationDetails: IOperation
  ): Promise<IManagedObject[]> {
    return await Promise.all(
      clients.map((tmp) => this.provisionLegacyFirmwareToTenant(tmp, firmware, selectedVersion, operationDetails))
    );
  }

  /**
   * DeProvisionFirmware is used to remove firmware and firmware versions from the given clients
   * @param clients
   * @param firmware
   * @param selectedVersion
   * @returns
   */
  async deprovisionLegacyFirmwareFromTenants(
    clients: Client[],
    firmware: IManagedObject,
    selectedVersion: IManagedObject
  ): Promise<void[]> {
    return await Promise.all(
      clients.map((tmp) => this.deprovisionLegacyFirmwareFromTenant(tmp, firmware, selectedVersion))
    );
  }

  /**
   * DeProvisionFirmware is used to remove firmware and firmware versions from the given client
   * @param client
   * @param firmware
   * @param selectedVersion
   */
  async deprovisionLegacyFirmwareFromTenant(
    client: Client,
    firmware: IManagedObject,
    selectedVersion: IManagedObject
  ): Promise<void> {
    const findFirmware = await this.checkIfFirmwareIsAvailable(client, firmware);
    if (findFirmware) {
      const findFirmwareVersion = await this.checkIfFirmwareVersionIsAvailable(
        client,
        findFirmware,
        selectedVersion.c8y_Firmware.version
      );
      if (findFirmwareVersion) {
        await client.inventory.delete(findFirmwareVersion.id);
      }
      const { data } = await client.inventory.detail(findFirmware.id);
      if (data.childAdditions.references.length === 0) {
        await client.inventory.delete(findFirmware.id);
      }
    }
  }
}
