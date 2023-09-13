import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule, hookRoute, ViewContext } from '@c8y/ngx-components';
import { TenantCreationStatisticsComponent } from './tenant-creation-statistics/tenant-creation-statistics.component';
import { SharedModule } from '@modules/shared/shared.module';

@NgModule({
  imports: [CommonModule, CoreModule, SharedModule],
  declarations: [TenantCreationStatisticsComponent],
  entryComponents: [TenantCreationStatisticsComponent],
  providers: [
    hookRoute([
      {
        path: 'measurement',
        context: ViewContext.Tenant,
        component: TenantCreationStatisticsComponent,
        label: 'Measurement History',
        priority: 100,
        icon: 'bar-chart-o'
      },
      {
        path: 'alarm',
        context: ViewContext.Tenant,
        component: TenantCreationStatisticsComponent,
        label: 'Alarm History',
        priority: 100,
        icon: 'bell'
      },
      {
        path: 'event',
        context: ViewContext.Tenant,
        component: TenantCreationStatisticsComponent,
        label: 'Event History',
        priority: 100,
        icon: 'c8y-events'
      },
      {
        path: 'operation',
        context: ViewContext.Tenant,
        component: TenantCreationStatisticsComponent,
        label: 'Operation History',
        priority: 100,
        icon: 'c8y-device-control'
      },
      {
        path: 'inventory',
        context: ViewContext.Tenant,
        component: TenantCreationStatisticsComponent,
        label: 'Inventory History',
        priority: 100,
        icon: 'cubes'
      }
    ])
  ]
})
export class TenantStatisticsModule {}
