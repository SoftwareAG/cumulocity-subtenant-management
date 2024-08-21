import { DeviceAction } from './extensions';

export interface TenantSpecificDetails<T> {
  id?: { tenant: string; id: string };
  tenantId: string;
  data: T;
  actions?: DeviceAction[];
  operations?: { [key: string]: unknown };
}
