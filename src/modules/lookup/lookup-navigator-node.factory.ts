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
    const userNode = new NavigatorNode({
      label: 'User',
      path: 'lookup/user',
      icon: 'c8y-user'
    });
    this.lookupNode.add(userNode);
  }

  get(activatedRoute?: ActivatedRoute): NavigatorNode {
    return this.lookupNode;
  }
}
