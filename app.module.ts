import { NgModule, OnDestroy } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule as ngRouterModule } from '@angular/router';
import { UpgradeModule as NgUpgradeModule } from '@angular/upgrade/static';
import { CoreModule, RouterModule, AlertService, AppStateService } from '@c8y/ngx-components';
import { ProvisioningModule } from '@modules/provisioning/provisioning.module';
import { LookupModule } from '@modules/lookup/lookup.module';
import { StatisticsModule } from '@modules/statistics/statistics.module';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { HomeModule } from '@modules/home/home.module';
import { CleanupModule } from '@modules/cleanup/cleanup.module';
import { RestartApamaActionModule } from '@modules/restart-apama/restart-apama.module';
import { SubtenantDetailsService } from '@services/subtenant-details.service';
import { ExtensionsService } from '@services/extensions.service';
import { CustomApiService } from '@services/custom-api.service';
import { ApiService } from '@c8y/ngx-components/api';
import { filter, map } from 'rxjs/operators';
import { IUser, UserService } from '@c8y/client';
import { Subscription } from 'rxjs';
import { HybridAppModule, UpgradeModule, UPGRADE_ROUTES } from '@c8y/ngx-components/upgrade';

@NgModule({
  imports: [
    UpgradeModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(),
    ngRouterModule.forRoot([...UPGRADE_ROUTES], { enableTracing: false, useHash: true }),
    CoreModule.forRoot(),
    NgUpgradeModule,
    HomeModule,
    CleanupModule,
    StatisticsModule,
    LookupModule,
    ProvisioningModule,
    RestartApamaActionModule,
  ],
  providers: [
    FakeMicroserviceService,
    SubtenantDetailsService,
    ExtensionsService,
    CustomApiService,
    {
      provide: ApiService,
      useExisting: CustomApiService
    }
  ]
})
export class AppModule extends HybridAppModule implements OnDestroy {
  private roleSubscription: Subscription;
  private roles = [
    'ROLE_APPLICATION_MANAGEMENT_ADMIN',
    'ROLE_APPLICATION_MANAGEMENT_READ',
    'ROLE_TENANT_MANAGEMENT_READ'
  ];
  private rolesTenantUpdate = ['ROLE_TENANT_MANAGEMENT_UPDATE', 'ROLE_TENANT_MANAGEMENT_ADMIN'];

  constructor(
    protected upgrade: NgUpgradeModule,
    private appState: AppStateService,
    private alertService: AlertService,
    private userService: UserService
  ) {
    super();
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
}
