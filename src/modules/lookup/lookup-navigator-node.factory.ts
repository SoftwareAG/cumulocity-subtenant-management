import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavigatorNode, NavigatorNodeFactory } from '@c8y/ngx-components';

@Injectable()
export class LookupNavigatorNodeFactory implements NavigatorNodeFactory {
  private lookupNode: NavigatorNode;
  constructor() {
    this.lookupNode = new NavigatorNode({
      label: 'Lookup',
      path: 'lookup',
      icon: 'search'
    });
    const deviceNode = new NavigatorNode({
      label: 'Device',
      path: 'lookup/device',
      icon: 'c8y-device'
    });
    this.lookupNode.add(deviceNode);
    const deviceRegistrationNode = new NavigatorNode({
      label: 'Device Registration',
      path: 'lookup/device-registration',
      icon: 'c8y-device-connect'
    });
    this.lookupNode.add(deviceRegistrationNode);
    const userNode = new NavigatorNode({
      label: 'User',
      path: 'lookup/user',
      icon: 'c8y-user'
    });
    this.lookupNode.add(userNode);
    const firmwareHistoryNode = new NavigatorNode({
      label: 'Firmware Update History',
      path: 'lookup/firmware-history',
      icon: 'floppy-o'
    });
    this.lookupNode.add(firmwareHistoryNode);
  }

  get(activatedRoute?: ActivatedRoute): NavigatorNode {
    return this.lookupNode;
  }
}
