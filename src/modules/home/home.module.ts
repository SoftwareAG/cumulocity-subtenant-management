import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home.component';
import { CoreModule, gettext, HOOK_NAVIGATOR_NODES, HOOK_ONCE_ROUTE, NavigatorNode, Route } from '@c8y/ngx-components';
import { TenantCreationHistoryComponent } from './tenant-creation-history/tenant-creation-history.component';
import { ChartsModule, ThemeService } from 'ng2-charts';
import { DeviceCreationHistoryComponent } from './device-creation-history/device-creation-history.component';

const translations = new NavigatorNode({
  label: gettext('Home'),
  icon: 'home',
  path: '/home',
  routerLinkExact: false
});

export const navigatorNodes = {
  provide: HOOK_NAVIGATOR_NODES,
  useValue: { get: (): NavigatorNode => translations },
  multi: true
};

@NgModule({
  imports: [CommonModule, CoreModule, ChartsModule],
  declarations: [HomeComponent, TenantCreationHistoryComponent, DeviceCreationHistoryComponent],
  entryComponents: [HomeComponent],
  providers: [
    ThemeService,
    {
      provide: HOOK_ONCE_ROUTE,
      useValue: [
        {
          path: '',
          redirectTo: 'home',
          pathMatch: 'full'
        },
        {
          path: 'home',
          component: HomeComponent
        }
      ] as Route[],
      multi: true
    },
    navigatorNodes
  ]
})
export class HomeModule {}
