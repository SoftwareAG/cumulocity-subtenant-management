import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule, hookNavigator } from '@c8y/ngx-components';
import { DeviceLookupComponent } from './device-lookup/device-lookup.component';
import { LookupNavigatorNodeFactory } from './lookup-navigator-node.factory';
import { UserLookupComponent } from './user-lookup/user-lookup.component';
import { FirmwareUpdateModalComponent } from './modals/firmware-update-modal/firmware-update-modal.component';
import { ConfigurationUpdateModalComponent } from './modals/configuration-update-modal/configuration-update-modal.component';
import { StoreQueryModalComponent } from './modals/store-query-modal/store-query-modal.component';
import { ModalModule } from 'ngx-bootstrap/modal';
import { HOOK_MICROSERVICE_ROLE } from '@services/fake-microservice.service';
import { LoadQueryModalComponent } from './modals/load-query-modal/load-query-modal.component';
import { SharedModule } from '@modules/shared/shared.module';
import { UserPasswordChangeModalComponent } from './modals/user-password-change-modal/user-password-change-modal.component';
import { AddUserModalComponent } from './modals/add-user-modal/add-user-modal.component';
import { DeviceRegistrationLookupComponent } from './device-registration-lookup/device-registration-lookup.component';
import { AddDeviceRegistrationModalComponent } from './modals/add-device-registration-modal/add-device-registration-modal.component';
import { CustomFirmwareUpdateModalComponent } from './modals/custom-firmware-update-modal/custom-firmware-update-modal.component';
import { FirmwareUpdateHistoryComponent } from './firmware-update-history/firmware-update-history.component';
import { RouterModule } from '@angular/router';
import { BulkDeviceRegistrationModalComponent } from './modals/bulk-device-registration-modal/bulk-device-registration-modal.component';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    ModalModule.forChild(),
    SharedModule,
    RouterModule.forChild([
      {
        path: 'lookup',
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'device'
          },
          {
            path: 'device',
            component: DeviceLookupComponent
          },
          {
            path: 'device-registration',
            component: DeviceRegistrationLookupComponent
          },
          {
            path: 'user',
            component: UserLookupComponent
          },
          {
            path: 'firmware-history',
            component: FirmwareUpdateHistoryComponent
          }
        ]
      }
    ])
  ],
  declarations: [
    DeviceLookupComponent,
    UserLookupComponent,
    DeviceRegistrationLookupComponent,
    FirmwareUpdateModalComponent,
    ConfigurationUpdateModalComponent,
    StoreQueryModalComponent,
    LoadQueryModalComponent,
    UserPasswordChangeModalComponent,
    AddUserModalComponent,
    AddDeviceRegistrationModalComponent,
    BulkDeviceRegistrationModalComponent,
    CustomFirmwareUpdateModalComponent,
    FirmwareUpdateHistoryComponent
  ],
  entryComponents: [
    DeviceLookupComponent,
    UserLookupComponent,
    DeviceRegistrationLookupComponent,
    FirmwareUpdateModalComponent,
    ConfigurationUpdateModalComponent,
    StoreQueryModalComponent,
    LoadQueryModalComponent,
    UserPasswordChangeModalComponent,
    AddUserModalComponent,
    AddDeviceRegistrationModalComponent,
    BulkDeviceRegistrationModalComponent,
    CustomFirmwareUpdateModalComponent,
    FirmwareUpdateHistoryComponent
  ],
  providers: [
    {
      provide: HOOK_MICROSERVICE_ROLE,
      useValue: [
        'ROLE_INVENTORY_READ',
        'ROLE_USER_MANAGEMENT_READ',
        'ROLE_USER_MANAGEMENT_ADMIN',
        'ROLE_DEVICE_CONTROL_READ',
        'ROLE_DEVICE_CONTROL_ADMIN'
      ],
      multi: true
    },
    LookupNavigatorNodeFactory,
    hookNavigator(LookupNavigatorNodeFactory)
  ]
})
export class LookupModule {}
