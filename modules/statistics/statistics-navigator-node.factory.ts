import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavigatorNode, NavigatorNodeFactory } from '@c8y/ngx-components';
import { Observable } from 'rxjs';

@Injectable()
export class StatisticsNavigatorNodeFactory implements NavigatorNodeFactory {
  private statisticsNode: NavigatorNode;
  constructor() {
    this.statisticsNode = new NavigatorNode({
      label: 'Statistics',
      path: 'statistics'
    });
    const firmwareNode = new NavigatorNode({
      label: 'Firmware',
      path: 'statistics/firmware',
      icon: 'floppy-o'
    });
    this.statisticsNode.add(firmwareNode);

    const inventoryNode = new NavigatorNode({
      label: 'Inventory',
      path: 'statistics/inventory',
      icon: 'object-group'
    });
    this.statisticsNode.add(inventoryNode);
  }

  get(activatedRoute?: ActivatedRoute): NavigatorNode {
    return this.statisticsNode;
  }

}
