import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule as ngRouterModule } from '@angular/router';
import { UpgradeModule as NgUpgradeModule } from '@angular/upgrade/static';
import { CoreModule, RouterModule } from '@c8y/ngx-components';
import { HybridAppModule, UpgradeModule, UPGRADE_ROUTES } from '@c8y/ngx-components/upgrade';
import { SubtenantManagementModule } from '@modules/subtenant-management.module';

@NgModule({
  imports: [
    UpgradeModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(),
    ngRouterModule.forRoot([...UPGRADE_ROUTES], { enableTracing: false, useHash: true }),
    CoreModule.forRoot(),
    NgUpgradeModule,
    SubtenantManagementModule.forRoot({ withHomePage: true })
  ]
})
export class AppModule extends HybridAppModule {
  constructor(protected upgrade: NgUpgradeModule) {
    super();
  }
}
