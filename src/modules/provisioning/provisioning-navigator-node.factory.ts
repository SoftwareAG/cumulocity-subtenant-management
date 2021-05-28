import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavigatorNode, NavigatorNodeFactory } from '@c8y/ngx-components';

@Injectable()
export class ProvisioningNavigatorNodeFactory implements NavigatorNodeFactory {
  private provisioningNode: NavigatorNode;
  constructor() {
    this.provisioningNode = new NavigatorNode({
      label: 'Provisioning',
      path: 'provisioning'
    });
    const firmwareNode = new NavigatorNode({
      label: 'Firmware',
      path: 'provisioning/firmware',
      icon: 'floppy-o'
    });
    this.provisioningNode.add(firmwareNode);

    const smartRestNode = new NavigatorNode({
      label: 'SmartREST templates',
      path: 'provisioning/smartrest',
      icon: 'file-code-o'
    });
    this.provisioningNode.add(smartRestNode);

    const tenantOptionsNode = new NavigatorNode({
      label: 'Tenant Options',
      path: 'provisioning/tenant-options'
      // icon: 'file-code-o'
    });
    this.provisioningNode.add(tenantOptionsNode);

    const retentionRulesNode = new NavigatorNode({
      label: 'Retention Rules',
      path: 'provisioning/retention-rules',
      icon: 'briefcase'
    });
    this.provisioningNode.add(retentionRulesNode);
  }

  get(activatedRoute?: ActivatedRoute): NavigatorNode {
    return this.provisioningNode;
  }
}
