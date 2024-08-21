import { InjectionToken } from '@angular/core';
import { Client, IManagedObject } from '@c8y/client';

export const HOOK_DEVICE_ACTION_FACTORY = new InjectionToken<DeviceActionsFactory>('DevcieActionFactory');
export interface DeviceAction {
  title: string;
  iconClasses?: string;
  buttonClasses?: string;
  onClickAction(clientOfTenant: Client, device: IManagedObject);
}

export interface DeviceActionsFactory {
  get(device: IManagedObject): DeviceAction[];
}
