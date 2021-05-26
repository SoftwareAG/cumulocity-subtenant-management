import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule as ngRouterModule } from '@angular/router';
import { CoreModule, BootstrapComponent, RouterModule } from '@c8y/ngx-components';
import { ProvisioningModule } from '@modules/provisioning/provisioning.module';
import { LookupModule } from '@modules/lookup/lookup.module';
import { StatisticsModule } from '@modules/statistics/statistics.module';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { HomeModule } from '@modules/home/home.module';
import { CleanupModule } from '@modules/cleanup/cleanup.module';
import { RestartApamaActionModule } from '@modules/restart-apama/restart-apama.module';
import { SubtenantDetailsService } from '@services/subtenant-details.service';
import { ExtensionsService } from '@services/extensions.service';

@NgModule({
  imports: [
    BrowserAnimationsModule,
    RouterModule.forRoot(),
    ngRouterModule.forRoot([], { enableTracing: false, useHash: true }),
    CoreModule.forRoot(),
    HomeModule,
    CleanupModule,
    StatisticsModule,
    LookupModule,
    ProvisioningModule,
    RestartApamaActionModule,
  ],
  providers: [FakeMicroserviceService, SubtenantDetailsService, ExtensionsService],
  bootstrap: [BootstrapComponent]
})
export class AppModule {}
