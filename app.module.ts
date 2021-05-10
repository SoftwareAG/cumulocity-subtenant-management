import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule as ngRouterModule } from '@angular/router';
import { CoreModule, BootstrapComponent, RouterModule } from '@c8y/ngx-components';
import { ProvisioningModule } from './modules/provisioning/provisioning.module';
import { LookupModule } from './modules/lookup/lookup.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { FakeMicroserviceService } from './services/fake-microservice.service';

@NgModule({
  imports: [
    BrowserAnimationsModule,
    RouterModule.forRoot(),
    ngRouterModule.forRoot([], { enableTracing: false, useHash: true }),
    CoreModule.forRoot(),
    StatisticsModule,
    LookupModule,
    ProvisioningModule
  ],
  providers: [FakeMicroserviceService],
  bootstrap: [BootstrapComponent]
})
export class AppModule {}
