import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ExtensionFactory, Route } from '@c8y/ngx-components';
import { SubtenantManagementConfigService } from '@services/subtenant-management-config.service';
import { HomeComponent } from './home.component';

@Injectable()
export class HomeRouteFactory implements ExtensionFactory<Route> {
  private homeRoutes: Route[];

  constructor(private configService: SubtenantManagementConfigService) {
    this.homeRoutes = [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        component: HomeComponent
      }
    ];
  }

  get(activatedRoute?: ActivatedRoute): Route | Route[] {
    if (this.configService.config && this.configService.config.withHomePage) {
      return this.homeRoutes;
    }
    return [];
  }
}
