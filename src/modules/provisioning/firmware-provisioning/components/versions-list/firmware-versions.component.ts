import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IManagedObject, IResultList } from '@c8y/client';
import { RepositoryService } from '@c8y/ngx-components/repository/shared';

@Component({
  selector: 'inet-firmware-versions',
  templateUrl: 'firmware-versions.component.html'
})
export class FirmwareVersionComponent {
  @Input() firmware: IManagedObject;

  @Output() onVersionSelect: EventEmitter<IManagedObject> = new EventEmitter<IManagedObject>();

  constructor(private repositoryService: RepositoryService) {}

  firmwareVersions: IResultList<IManagedObject>;

  ngOnChanges() {
    this.loadFirmwareVersions();
  }

  /**
   * loadFirmwareVersions is used to load all firmware versions for the selected firmware
   */
  async loadFirmwareVersions() {
    this.firmwareVersions = await this.repositoryService.listBaseVersions(this.firmware);
  }

  /**
   * updateSelected is used to set the selected firmware version for provisioning or de-provisioning
   */
  updateSelected(checked, version) {
    this.onVersionSelect.emit(version);
  }
}
