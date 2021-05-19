import { DeviceAction } from './extensions';

export interface TenantSpecificDetails<T> {
  tenantId: string;
  data: T;
  actions?: DeviceAction[];
  operations?: { [key: string]: unknown };
}
