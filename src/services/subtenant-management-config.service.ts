import { Inject, Injectable, Optional } from '@angular/core';
import { HOOK_SUBTENANT_MANAGEMENT_CONFIG, ISubtenantManagementConfig } from '@models/subtenant-management-config';
import { flatMap } from 'lodash-es';

@Injectable()
export class SubtenantManagementConfigService {
  public readonly config: ISubtenantManagementConfig | undefined;
  constructor(
    @Optional()
    @Inject(HOOK_SUBTENANT_MANAGEMENT_CONFIG)
    configs: ISubtenantManagementConfig | (ISubtenantManagementConfig | ISubtenantManagementConfig[])[]
  ) {
    if (configs && Array.isArray(configs)) {
      const flatConfigs = flatMap(configs || []);
      this.config = flatConfigs.reduceRight((prev, curr) => Object.assign(prev, curr), {});
    } else {
      this.config = configs as ISubtenantManagementConfig;
    }
  }
}
