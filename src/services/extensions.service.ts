import { Inject, Injectable, Optional } from '@angular/core';
import { DeviceActionsFactory, HOOK_DEVICE_ACTION_FACTORY } from '@models/extensions';
import { flatMap } from 'lodash-es';

@Injectable()
export class ExtensionsService {
  private deviceActionFactories: DeviceActionsFactory[] = [];
  constructor(
    @Optional() @Inject(HOOK_DEVICE_ACTION_FACTORY) factories: (DeviceActionsFactory | DeviceActionsFactory[])[]
  ) {
    if (factories) {
      const roles = flatMap(factories);
      this.deviceActionFactories = roles;
    }
  }

  getDeviceActionFactories(): DeviceActionsFactory[] {
    return this.deviceActionFactories;
  }
}
