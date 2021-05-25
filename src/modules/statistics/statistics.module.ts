import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule, HOOK_NAVIGATOR_NODES, HOOK_ONCE_ROUTE, Route } from '@c8y/ngx-components';
import { FirmwareStatisticsComponent } from './firmware-statistics/firmware-statistics.component';
import { StatisticsNavigatorNodeFactory } from './statistics-navigator-node.factory';
import { InventoryStatisticsComponent } from './inventory-statistics/inventory-statistics.component';
import { HOOK_MICROSERVICE_ROLE } from '@services/fake-microservice.service';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { SharedModule } from '@modules/shared/shared.module';

@NgModule({
  imports: [CommonModule, CoreModule, PopoverModule, SharedModule],
  declarations: [FirmwareStatisticsComponent, InventoryStatisticsComponent],
  entryComponents: [FirmwareStatisticsComponent, InventoryStatisticsComponent],
  providers: [
    {
      provide: HOOK_MICROSERVICE_ROLE,
      useValue: ['ROLE_INVENTORY_READ'],
      multi: true
    },
    {
      provide: HOOK_ONCE_ROUTE,
      useValue: [
        {
          path: 'statistics',
          redirectTo: 'statistics/firmware'
          // canActivate: [DeviceDashboardGuard],
        },
        {
          path: 'statistics/firmware',
          component: FirmwareStatisticsComponent
          // canActivate: [DeviceDashboardGuard],
        },
        {
          path: 'statistics/inventory',
          component: InventoryStatisticsComponent
          // canActivate: [DeviceDashboardGuard],
        }
      ] as Route[],
      multi: true
    },
    StatisticsNavigatorNodeFactory,
    {
      provide: HOOK_NAVIGATOR_NODES,
      useClass: StatisticsNavigatorNodeFactory,
      multi: true
    }
  ]
})
export class StatisticsModule {}
