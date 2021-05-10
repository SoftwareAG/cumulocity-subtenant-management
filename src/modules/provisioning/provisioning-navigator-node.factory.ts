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
  }

  get(activatedRoute?: ActivatedRoute): NavigatorNode {
    return this.provisioningNode;
  }
}
