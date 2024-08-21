import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule, hookNavigator } from '@c8y/ngx-components';
import { FirmwareStatisticsComponent } from './firmware-statistics/firmware-statistics.component';
import { StatisticsNavigatorNodeFactory } from './statistics-navigator-node.factory';
import { InventoryStatisticsComponent } from './inventory-statistics/inventory-statistics.component';
import { HOOK_MICROSERVICE_ROLE } from '@services/fake-microservice.service';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { SharedModule } from '@modules/shared/shared.module';
import { PieChartComponent } from './pie-chart/pie-chart.component';
import { BaseChartDirective, ThemeService } from 'ng2-charts';
import { RouterModule } from '@angular/router';
import { StorageStatisticsComponent } from './storage-statistics/storage-statistics.component';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    PopoverModule,
    SharedModule,
    BaseChartDirective,
    RouterModule.forChild([
      {
        path: 'statistics',
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'firmware'
          },
          {
            path: 'firmware',
            component: FirmwareStatisticsComponent
          },
          {
            path: 'inventory',
            component: InventoryStatisticsComponent
          },
          {
            path: 'storage',
            component: StorageStatisticsComponent
          }
        ]
      }
    ])
  ],
  declarations: [
    FirmwareStatisticsComponent,
    InventoryStatisticsComponent,
    PieChartComponent,
    StorageStatisticsComponent
  ],
  providers: [
    ThemeService,
    {
      provide: HOOK_MICROSERVICE_ROLE,
      useValue: [
        'ROLE_INVENTORY_READ',
        'ROLE_MEASUREMENT_READ',
        'ROLE_EVENT_READ',
        'ROLE_ALARM_READ',
        'ROLE_DEVICE_CONTROL_READ'
      ],
      multi: true
    },
    StatisticsNavigatorNodeFactory,
    hookNavigator(StatisticsNavigatorNodeFactory)
  ]
})
export class StatisticsModule {}
