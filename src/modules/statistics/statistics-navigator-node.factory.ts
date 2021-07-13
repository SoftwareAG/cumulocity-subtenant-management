import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavigatorNode, NavigatorNodeFactory } from '@c8y/ngx-components';

@Injectable()
export class StatisticsNavigatorNodeFactory implements NavigatorNodeFactory {
  private statisticsNode: NavigatorNode;
  constructor() {
    this.statisticsNode = new NavigatorNode({
      label: 'Statistics',
      path: 'statistics',
      icon: 'line-chart'
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

    const storageNode = new NavigatorNode({
      label: 'Storage',
      path: 'statistics/storage',
      icon: 'object-group'
    });
    this.statisticsNode.add(storageNode);
  }

  get(activatedRoute?: ActivatedRoute): NavigatorNode {
    return this.statisticsNode;
  }
}
