import { InjectionToken } from '@angular/core';

export const HOOK_SUBTENANT_MANAGEMENT_CONFIG = new InjectionToken<ISubtenantManagementConfig>(
  'SubtenantManagementConfig'
);

export interface ISubtenantManagementConfig {
  withHomePage?: boolean;
}
