import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { gettext, NavigatorNode, NavigatorNodeFactory } from '@c8y/ngx-components';
import { SubtenantManagementConfigService } from '@services/subtenant-management-config.service';

@Injectable()
export class HomeNavigatorNodeFactory implements NavigatorNodeFactory {
  private homeNode: NavigatorNode;

  constructor(private configService: SubtenantManagementConfigService) {
    this.homeNode = new NavigatorNode({
      label: gettext('Home'),
      icon: 'home',
      path: '/home',
      priority: 10000,
      routerLinkExact: false
    });
  }

  get(activatedRoute?: ActivatedRoute): NavigatorNode | NavigatorNode[] {
    if (this.configService.config && this.configService.config.withHomePage) {
      return this.homeNode;
    }
    return [];
  }
}
