import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantAppLogsComponent } from './tenant-app-logs.component';
import { CoreModule, HOOK_ONCE_ROUTE, HOOK_TABS, Route, ViewContext } from '@c8y/ngx-components';
import { AppsOfTenantTabFactory } from './apps-of-tenant-tab.factory';
import { HOOK_MICROSERVICE_ROLE } from '@services/fake-microservice.service';

@NgModule({
  imports: [CommonModule, CoreModule],
  declarations: [TenantAppLogsComponent],
  entryComponents: [TenantAppLogsComponent],
  providers: [
    {
      provide: HOOK_ONCE_ROUTE,
      useValue: {
        path: 'app-log/:appId/:instanceName',
        context: ViewContext.Tenant,
        component: TenantAppLogsComponent,
        tabs: []
      } as Route,
      multi: true
    },
    {
      provide: HOOK_TABS,
      useClass: AppsOfTenantTabFactory,
      multi: true
    },
    {
      provide: HOOK_MICROSERVICE_ROLE,
      useValue: ['ROLE_APPLICATION_MANAGEMENT_READ', 'ROLE_APPLICATION_MANAGEMENT_ADMIN'],
      multi: true
    }
  ]
})
export class TenantAppLogsModule {}
