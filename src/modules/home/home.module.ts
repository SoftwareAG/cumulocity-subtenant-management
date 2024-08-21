import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home.component';
import { CoreModule, hookNavigator, hookRoute } from '@c8y/ngx-components';
import { TenantCreationHistoryComponent } from './tenant-creation-history/tenant-creation-history.component';
import { ThemeService, BaseChartDirective } from 'ng2-charts';
import { DeviceCreationHistoryComponent } from './device-creation-history/device-creation-history.component';
import { HomeNavigatorNodeFactory } from './home-navigator-node.factory';
import { HomeRouteFactory } from './home-route.factory';

@NgModule({
  imports: [CommonModule, CoreModule, BaseChartDirective],
  declarations: [HomeComponent, TenantCreationHistoryComponent, DeviceCreationHistoryComponent],
  providers: [ThemeService, hookRoute(HomeRouteFactory), hookNavigator(HomeNavigatorNodeFactory)]
})
export class HomeModule {}
