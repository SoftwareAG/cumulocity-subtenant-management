import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule as NgRouterModule } from '@angular/router';
import { UpgradeModule as NgUpgradeModule } from '@angular/upgrade/static';
import { CoreModule, RouterModule } from '@c8y/ngx-components';
import { AppLogsAutoRefreshModule } from '@c8y/ngx-components/app-logs';
import { ConnectivityModule } from '@c8y/ngx-components/connectivity';
import { SmsGatewayModule } from '@c8y/ngx-components/sms-gateway';
import { HybridAppModule, UpgradeModule, UPGRADE_ROUTES } from '@c8y/ngx-components/upgrade';
import { BinaryFileDownloadModule } from '@c8y/ngx-components/binary-file-download';
import { DefaultSubscriptionsModule } from '@c8y/ngx-components/default-subscriptions';
import { SubtenantManagementModule } from '@modules/subtenant-management.module';

@NgModule({
  imports: [
    // Upgrade module must be the first
    UpgradeModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(),
    NgRouterModule.forRoot([...UPGRADE_ROUTES], { enableTracing: false, useHash: true }),
    CoreModule.forRoot(),
    NgUpgradeModule,
    AppLogsAutoRefreshModule,
    SmsGatewayModule,
    ConnectivityModule,
    BinaryFileDownloadModule,
    DefaultSubscriptionsModule,
    SubtenantManagementModule.forRoot()
  ]
})
export class AppModule extends HybridAppModule {
  constructor(protected upgrade: NgUpgradeModule) {
    super();
  }
}
