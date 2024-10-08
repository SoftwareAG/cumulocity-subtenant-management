import { Component } from '@angular/core';
import { IManagedObject, InventoryService } from '@c8y/client';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { ProvisioningService } from '@services/provisioning.service';

@Component({
  selector: 'ps-firmware-provisioning',
  templateUrl: './firmware-provisioning.component.html'
})
export class FirmwareProvisioningComponent {
  firmwares: Promise<IManagedObject[]>;

  constructor(
    private credService: FakeMicroserviceService,
    private inventory: InventoryService,
    private provisioning: ProvisioningService
  ) {
    this.firmwares = this.getFirmwares();
  }

  private async getFirmwares() {
    const filter = {
      query: `$filter=(type eq 'c8y_Firmware' and has(url))`,
      pageSize: 2000
    };
    const { data } = await this.inventory.list(filter);
    return data;
  }

  provisionFirmware(firmware: IManagedObject): void {
    this.credService.prepareCachedDummyMicroserviceForAllSubtenants().then(async (creds) => {
      const clients = await this.credService.createClients(creds);
      return this.provisioning.provisionLegacyFirmwareToTenants(clients, firmware);
    });
  }

  deprovisioningFirmware(firmware: IManagedObject): void {
    this.credService.prepareCachedDummyMicroserviceForAllSubtenants().then(async (creds) => {
      const clients = await this.credService.createClients(creds);
      return this.provisioning.deprovisionLegacyFirmwareFromTenants(clients, firmware);
    });
  }
}
