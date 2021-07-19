import { ModuleWithProviders, NgModule, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService, AppStateService, CoreModule } from '@c8y/ngx-components';
import { UserService, IUser } from '@c8y/client';
import { ApiService } from '@c8y/ngx-components/api';
import { CustomApiService } from '@services/custom-api.service';
import { ExtensionsService } from '@services/extensions.service';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { SubtenantDetailsService } from '@services/subtenant-details.service';
import { Subscription } from 'rxjs';
import { CleanupModule } from './cleanup/cleanup.module';
import { HomeModule } from './home/home.module';
import { LookupModule } from './lookup/lookup.module';
import { ProvisioningModule } from './provisioning/provisioning.module';
import { RestartApamaActionModule } from './restart-apama/restart-apama.module';
import { StatisticsModule } from './statistics/statistics.module';
import { filter, map } from 'rxjs/operators';
import { HOOK_SUBTENANT_MANAGEMENT_CONFIG, ISubtenantManagementConfig } from '@models/subtenant-management-config';
import { SubtenantManagementConfigService } from '@services/subtenant-management-config.service';
import { TenantStatisticsModule } from './tenant-statistics/tenant-statistics.module';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    HomeModule,
    CleanupModule,
    StatisticsModule,
    LookupModule,
    ProvisioningModule,
    RestartApamaActionModule,
    TenantStatisticsModule
  ],
  providers: [
    SubtenantManagementConfigService,
    FakeMicroserviceService,
    SubtenantDetailsService,
    ExtensionsService,
    CustomApiService
  ]
})
export class SubtenantManagementModule implements OnDestroy {
  private roleSubscription: Subscription;
  private roles = [
    'ROLE_APPLICATION_MANAGEMENT_ADMIN',
    'ROLE_APPLICATION_MANAGEMENT_READ',
    'ROLE_TENANT_MANAGEMENT_READ'
  ];
  private rolesTenantUpdate = ['ROLE_TENANT_MANAGEMENT_UPDATE', 'ROLE_TENANT_MANAGEMENT_ADMIN'];

  constructor(private appState: AppStateService, private alertService: AlertService, private userService: UserService) {
    this.roleSubscription = this.appState.currentUser
      .pipe(
        filter((user) => !!user),
        map((user) => this.hasAllRolesForPropperUsage(user))
      )
      .subscribe((hasAllRequiredRoles) => {
        if (!hasAllRequiredRoles) {
          const requiredRoles = this.roles.join(', ');
          const onOfTenantUpdateRoles = this.rolesTenantUpdate.join(', ');
          this.alertService.warning(
            'Your account does not have all permissions to fully operate this app',
            `You need to have all of the following roles:\r\n${requiredRoles}\r\n\r\nIn addition you need one of the follwing roles for Subscribing Apps to tenants:\r\n${onOfTenantUpdateRoles}`
          );
        }
      });
  }

  ngOnDestroy(): void {
    if (this.roleSubscription) {
      this.roleSubscription.unsubscribe();
    }
  }

  hasAllRolesForPropperUsage(user: IUser): boolean {
    return this.userService.hasAllRoles(user, this.roles) && this.userService.hasAnyRole(user, this.rolesTenantUpdate);
  }

  static forRoot(config: ISubtenantManagementConfig = {}): ModuleWithProviders {
    return {
      ngModule: SubtenantManagementModule,
      providers: [
        { provide: HOOK_SUBTENANT_MANAGEMENT_CONFIG, useValue: config },
        {
          provide: ApiService,
          useExisting: CustomApiService
        }
      ]
    };
  }
}
