import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule, HOOK_NAVIGATOR_NODES, HOOK_ONCE_ROUTE, Route } from '@c8y/ngx-components';
import { ProvisioningNavigatorNodeFactory } from './provisioning-navigator-node.factory';
import { FirmwareProvisioningComponent } from './firmware-provisioning/firmware-provisioning.component';
import { SmartrestProvisioningComponent } from './smartrest-provisioning/smartrest-provisioning.component';
import { HOOK_MICROSERVICE_ROLE } from '@services/fake-microservice.service';
import { TenantOptionsProvisioningComponent } from './tenant-options-provisioning/tenant-options-provisioning.component';
import { TenantOptionModalComponent } from './modals/tenant-option-modal/tenant-option-modal.component';
import { ModalModule } from 'ngx-bootstrap/modal';

@NgModule({
  imports: [CommonModule, CoreModule, ModalModule],
  declarations: [
    FirmwareProvisioningComponent,
    SmartrestProvisioningComponent,
    TenantOptionsProvisioningComponent,
    TenantOptionModalComponent
  ],
  entryComponents: [
    FirmwareProvisioningComponent,
    SmartrestProvisioningComponent,
    TenantOptionsProvisioningComponent,
    TenantOptionModalComponent
  ],
  providers: [
    {
      provide: HOOK_MICROSERVICE_ROLE,
      useValue: [
        'ROLE_INVENTORY_ADMIN',
        'ROLE_INVENTORY_READ',
        'ROLE_OPTION_MANAGEMENT_READ',
        'ROLE_OPTION_MANAGEMENT_ADMIN',
        'ROLE_IDENTITY_READ',
        'ROLE_IDENTITY_ADMIN'
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
          component: FirmwareProvisioningComponent
          // canActivate: [DeviceDashboardGuard],
        },
        {
          path: 'provisioning/smartrest',
          component: SmartrestProvisioningComponent
          // canActivate: [DeviceDashboardGuard],
        },
        {
          path: 'provisioning/tenant-options',
          component: TenantOptionsProvisioningComponent
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
export class ProvisioningModule {}
