import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home.component';
import { CoreModule, HOOK_NAVIGATOR_NODES, HOOK_ONCE_ROUTE } from '@c8y/ngx-components';
import { TenantCreationHistoryComponent } from './tenant-creation-history/tenant-creation-history.component';
import { ChartsModule, ThemeService } from 'ng2-charts';
import { DeviceCreationHistoryComponent } from './device-creation-history/device-creation-history.component';
import { HomeNavigatorNodeFactory } from './home-navigator-node.factory';
import { HomeRouteFactory } from './home-route.factory';

@NgModule({
  imports: [CommonModule, CoreModule, ChartsModule],
  declarations: [HomeComponent, TenantCreationHistoryComponent, DeviceCreationHistoryComponent],
  entryComponents: [HomeComponent],
  providers: [
    ThemeService,
    {
      provide: HOOK_ONCE_ROUTE,
      useClass: HomeRouteFactory,
      multi: true
    },
    {
      provide: HOOK_NAVIGATOR_NODES,
      useClass: HomeNavigatorNodeFactory,
      multi: true
    }
  ]
})
export class HomeModule {}
