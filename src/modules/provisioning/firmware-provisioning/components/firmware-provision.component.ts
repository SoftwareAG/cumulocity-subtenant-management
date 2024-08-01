import { Component } from '@angular/core';
import { IResultList, IManagedObject } from '@c8y/client';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, shareReplay, switchMap, tap } from 'rxjs/operators';
import { AdvancedSoftwareService, RepositoryService, RepositoryType } from '@c8y/ngx-components/repository/shared';
import { OperationRealtimeService } from '@c8y/ngx-components';

@Component({
  providers: [RepositoryService, OperationRealtimeService, AdvancedSoftwareService],
  selector: 'inet-firmware-provision',
  templateUrl: 'firmware-provision.component.html'
})
export class FirmwareProvisionComponent {
  pageTitle: string = 'Firmware Provisioning';

  textFilter$: BehaviorSubject<string> = new BehaviorSubject('');
  reload$: BehaviorSubject<void> = new BehaviorSubject(null);
  reloading: boolean = false;
  firmwares$: Observable<IResultList<IManagedObject>> = combineLatest(
    this.textFilter$.pipe(debounceTime(400), distinctUntilChanged()),
    this.reload$
  ).pipe(
    tap(() => {
      this.reloading = true;
    }),
    switchMap(([text]) => this.getFirmwares(text)),
    tap(() => {
      this.reloading = false;
    }),
    shareReplay(1)
  );

  showFirmwareProvisionModal: boolean = false;
  firmwareProvisionModalTitle: string = 'Firmware Provisioning';
  firmwareProvisionModalFirmware: IManagedObject;
  firmwareProvisionModalProvisionFirmware: boolean = true;

  constructor(private repositoryService: RepositoryService) {}

  getFirmwares(partialText?: string) {
    const properties: string[] = ['name', 'description', 'c8y_Filter.type'];
    const partialTextFilter = { partialText, properties };
    return this.repositoryService.listRepositoryEntries(RepositoryType.FIRMWARE, {
      partialTextFilter
    });
  }

  provisionFirmware(firmware: IManagedObject, provisionFirmware: boolean) {
    this.showFirmwareProvisionModal = true;
    this.firmwareProvisionModalTitle = provisionFirmware ? 'Firmware Provisioning' : 'Firmware De-Provisioning';
    this.firmwareProvisionModalFirmware = firmware;
    this.firmwareProvisionModalProvisionFirmware = provisionFirmware;
  }

  closeFirmwareProvisionModal() {
    this.pageTitle = 'Firmware Provisioning';
    this.showFirmwareProvisionModal = false;
  }
}
