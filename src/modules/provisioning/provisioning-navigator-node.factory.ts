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

    const applicationsNode = new NavigatorNode({
      label: 'Applications',
      path: 'provisioning/applications',
      icon: 'c8y-modules'
    });
    this.provisioningNode.add(applicationsNode);

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

    const globalRolesNode = new NavigatorNode({
      label: 'Global Roles',
      path: 'provisioning/global_roles',
      icon: 'c8y-users'
    });
    this.provisioningNode.add(globalRolesNode);

    const smartGroupsNode = new NavigatorNode({
      label: 'Smart Groups',
      path: 'provisioning/smart-groups',
      icon: 'c8y-group-smart'
    });
    this.provisioningNode.add(smartGroupsNode);

    const alarmMappingNode = new NavigatorNode({
      label: 'Alarm Mapping',
      path: 'provisioning/alarm-mapping',
      icon: 'c8y-alarm'
    });
    this.provisioningNode.add(alarmMappingNode);
  }

  get(activatedRoute?: ActivatedRoute): NavigatorNode {
    return this.provisioningNode;
  }
}
