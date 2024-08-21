import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { UpgradeModule as NgUpgradeModule } from '@angular/upgrade/static';
import { CoreModule, RouterModule } from '@c8y/ngx-components';
// import { AppLogsAutoRefreshModule } from '@c8y/ngx-components/app-logs';
// import { ConnectivityModule, SimModule } from '@c8y/ngx-components/connectivity';
// import { SmsGatewayModule } from '@c8y/ngx-components/sms-gateway';
import { HybridAppModule, UpgradeModule, UPGRADE_ROUTES } from '@c8y/ngx-components/upgrade';
// import { BinaryFileDownloadModule } from '@c8y/ngx-components/binary-file-download';
// import { DefaultSubscriptionsModule } from '@c8y/ngx-components/default-subscriptions';
// import { EcosystemModule } from '@c8y/ngx-components/ecosystem';
import { TenantsModule } from '@c8y/ngx-components/tenants';
// import { DataBrokerModule } from '@c8y/ngx-components/data-broker';
// import { AuthConfigurationModule } from '@c8y/ngx-components/auth-configuration';
// import { MultipleLnsConnectorsModule } from '@c8y/ngx-components/protocol-lpwan';
// import { FilesRepositoryModule } from '@c8y/ngx-components/files-repository';
// import { UserRolesModule } from '@c8y/ngx-components/user-roles';
// import { PlatformConfigurationModule } from '@c8y/ngx-components/platform-configuration';
// import { BookmarksModule } from '@c8y/ngx-components/bookmarks';
import { SubtenantManagementModule } from '@modules/subtenant-management.module';

import { TimeScale } from 'chart.js';
import Chart from 'chart.js/auto';
Chart.register(TimeScale);
import 'chartjs-adapter-moment';

@NgModule({
  imports: [
    // Upgrade module must be the first
    UpgradeModule,
    BrowserAnimationsModule,
    RouterModule.forRoot([...UPGRADE_ROUTES]),
    CoreModule.forRoot(),
    NgUpgradeModule,
    // AppLogsAutoRefreshModule,
    // SmsGatewayModule,
    // ConnectivityModule,
    // SimModule,
    // BinaryFileDownloadModule,
    // DefaultSubscriptionsModule,
    // EcosystemModule,
    // AuthConfigurationModule,
    TenantsModule,
    // DataBrokerModule,
    // FilesRepositoryModule,
    // MultipleLnsConnectorsModule,
    // UserRolesModule,
    // BookmarksModule,
    // PlatformConfigurationModule,
    SubtenantManagementModule.forRoot({ withHomePage: true })
  ]
})
export class AppModule extends HybridAppModule {
  constructor(protected override upgrade: NgUpgradeModule) {
    super();
  }
}
