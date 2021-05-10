import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule, HOOK_NAVIGATOR_NODES, HOOK_ONCE_ROUTE, Route } from '@c8y/ngx-components';
import { ProvisioningNavigatorNodeFactory } from './provisioning-navigator-node.factory';
import { FirmwareProvisioningComponent } from './firmware-provisioning/firmware-provisioning.component';
import { SmartrestProvisioningComponent } from './smartrest-provisioning/smartrest-provisioning.component';
import { HOOK_MICROSERVICE_ROLE } from '@services/fake-microservice.service';

@NgModule({
  imports: [
    CommonModule,
    CoreModule
  ],
  declarations: [
    FirmwareProvisioningComponent,
    SmartrestProvisioningComponent
  ],
  entryComponents: [
    FirmwareProvisioningComponent,
    SmartrestProvisioningComponent
  ],
  providers: [
    {
      provide: HOOK_MICROSERVICE_ROLE,
      useValue: [
        'ROLE_INVENTORY_ADMIN',
        'ROLE_INVENTORY_READ',
        'ROLE_OPTION_MANAGEMENT_READ',
        'ROLE_OPTION_MANAGEMENT_ADMIN',
      ],
      multi: true
    },
    {
      provide: HOOK_ONCE_ROUTE,
      useValue: [
        {
          path: 'provisioning',
          redirectTo: 'provisioning/firmware'
        },
        {
          path: 'provisioning/firmware',
          component: FirmwareProvisioningComponent,
          // canActivate: [DeviceDashboardGuard],
        },
        {
          path: 'provisioning/smartrest',
          component: SmartrestProvisioningComponent,
          // canActivate: [DeviceDashboardGuard],
        }
      ] as Route[],
      multi: true
    },
    ProvisioningNavigatorNodeFactory,
    {
      provide: HOOK_NAVIGATOR_NODES,
      useClass: ProvisioningNavigatorNodeFactory,
      multi: true
    }
  ]
})
export class ProvisioningModule { }
