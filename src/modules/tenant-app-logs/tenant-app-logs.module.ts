import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantAppLogsComponent } from './tenant-app-logs.component';
import { CoreModule, hookRoute, hookTab, ViewContext } from '@c8y/ngx-components';
import { AppsOfTenantTabFactory } from './apps-of-tenant-tab.factory';
import { HOOK_MICROSERVICE_ROLE } from '@services/fake-microservice.service';

@NgModule({
  imports: [CommonModule, CoreModule],
  declarations: [TenantAppLogsComponent],
  entryComponents: [TenantAppLogsComponent],
  providers: [
    hookRoute({
      path: 'app-log/:appId/:instanceName',
      context: ViewContext.Tenant,
      component: TenantAppLogsComponent,
      tabs: []
    }),
    hookTab(AppsOfTenantTabFactory),
    {
      provide: HOOK_MICROSERVICE_ROLE,
      useValue: ['ROLE_APPLICATION_MANAGEMENT_READ', 'ROLE_APPLICATION_MANAGEMENT_ADMIN'],
      multi: true
    }
  ]
})
export class TenantAppLogsModule {}
