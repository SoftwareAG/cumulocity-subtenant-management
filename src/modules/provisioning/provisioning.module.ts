import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule, hookNavigator } from '@c8y/ngx-components';
import { ProvisioningNavigatorNodeFactory } from './provisioning-navigator-node.factory';
import { SmartrestProvisioningComponent } from './smartrest-provisioning/smartrest-provisioning.component';
import { HOOK_MICROSERVICE_ROLE } from '@services/fake-microservice.service';
import { TenantOptionsProvisioningComponent } from './tenant-options-provisioning/tenant-options-provisioning.component';
import { TenantOptionModalComponent } from './modals/tenant-option-modal/tenant-option-modal.component';
import { ModalModule } from 'ngx-bootstrap/modal';
import { RetentionRuleProvisioningComponent } from './retention-rule-provisioning/retention-rule-provisioning.component';
import { SharedModule } from '@modules/shared/shared.module';
import { CreateOrEditRetentionRuleModalComponent } from './modals/create-or-edit-retention-rule/create-or-edit-retention-rule-modal.component';
import { GlobalRolesProvisioningComponent } from './global-roles-provisioning/global-roles-provisioning.component';
import { SmartGroupsProvisioningComponent } from './smart-group-provisioning/smart-group-provisioning.component';
import { AlarmMappingProvisioningComponent } from './alarm-mapping-provisioning/alarm-mapping-provisioning.component';
import { RouterModule } from '@angular/router';
import { ApplicationProvisioningComponent } from './application-provisioning/application-provisioning.component';
import { TenantsHavingAppModalComponent } from './application-provisioning/tenants-having-app-modal/tenants-having-app-modal.component';
import { AnalyticsBuilderProvisioningComponent } from './analytics-builder-provisioning/analytics-builder-provisioning.component';
import { RoleHavingPermissionsModalComponent } from './global-roles-provisioning/role-having-permissions-modal/role-having-permissions-modal.component';
import { RoleHavingAppModalComponent } from './global-roles-provisioning/role-having-app-modal/role-having-app-modal.component';
import { EplProvisioningComponent } from './epl-provisioning/epl-provisioning.component';
import { FirmwareProvisionComponent } from './firmware-provisioning/components/firmware-provision.component';
import { FirmwareProvisionModalComponent } from './firmware-provisioning/components/modal/firmware-provsion-modal.component';
import { FirmwareVersionComponent } from './firmware-provisioning/components/versions-list/firmware-versions.component';
import { TenantListComponent } from './firmware-provisioning/components/tenants-list/tenant-list.component';
import { OperationSchedulerComponent } from './firmware-provisioning/components/operation-scheduler/operation-scheduler.component';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    ModalModule,
    SharedModule,
    RouterModule.forChild([
      {
        path: 'provisioning',
        children: [
          {
            path: '',
            redirectTo: 'firmware',
            pathMatch: 'full'
          },
          {
            path: 'epl',
            component: EplProvisioningComponent
          },
          {
            path: 'applications',
            component: ApplicationProvisioningComponent
          },
          {
            path: 'analytics-builder',
            component: AnalyticsBuilderProvisioningComponent
          },
          {
            path: 'firmware',
            component: FirmwareProvisionComponent
          },
          {
            path: 'smartrest',
            component: SmartrestProvisioningComponent
          },
          {
            path: 'tenant-options',
            component: TenantOptionsProvisioningComponent
          },
          {
            path: 'retention-rules',
            component: RetentionRuleProvisioningComponent
          },
          {
            path: 'global_roles',
            component: GlobalRolesProvisioningComponent
          },
          {
            path: 'smart-groups',
            component: SmartGroupsProvisioningComponent
          },
          {
            path: 'alarm-transformation',
            component: AlarmMappingProvisioningComponent
          }
        ]
      }
    ])
  ],
  declarations: [
    ApplicationProvisioningComponent,
    TenantsHavingAppModalComponent,
    RoleHavingPermissionsModalComponent,
    RoleHavingAppModalComponent,
    FirmwareProvisionComponent,
    FirmwareProvisionModalComponent,
    FirmwareVersionComponent,
    OperationSchedulerComponent,
    TenantListComponent,
    SmartrestProvisioningComponent,
    TenantOptionsProvisioningComponent,
    TenantOptionModalComponent,
    RetentionRuleProvisioningComponent,
    CreateOrEditRetentionRuleModalComponent,
    GlobalRolesProvisioningComponent,
    SmartGroupsProvisioningComponent,
    AlarmMappingProvisioningComponent,
    EplProvisioningComponent,
    AnalyticsBuilderProvisioningComponent
  ],
  entryComponents: [
    ApplicationProvisioningComponent,
    TenantsHavingAppModalComponent,
    RoleHavingPermissionsModalComponent,
    RoleHavingAppModalComponent,
    FirmwareProvisionComponent,
    FirmwareProvisionModalComponent,
    FirmwareVersionComponent,
    OperationSchedulerComponent,
    TenantListComponent,
    SmartrestProvisioningComponent,
    TenantOptionsProvisioningComponent,
    TenantOptionModalComponent,
    RetentionRuleProvisioningComponent,
    CreateOrEditRetentionRuleModalComponent,
    GlobalRolesProvisioningComponent,
    SmartGroupsProvisioningComponent,
    AlarmMappingProvisioningComponent,
    EplProvisioningComponent,
    AnalyticsBuilderProvisioningComponent
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
        'ROLE_IDENTITY_ADMIN',
        'ROLE_RETENTION_RULE_READ',
        'ROLE_RETENTION_RULE_ADMIN',
        'ROLE_APPLICATION_MANAGEMENT_READ',
        'ROLE_ALARM_READ',
        'ROLE_ALARM_ADMIN'
      ],
      multi: true
    },
    ProvisioningNavigatorNodeFactory,
    hookNavigator(ProvisioningNavigatorNodeFactory)
  ]
})
export class ProvisioningModule {}
