import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule, HOOK_ACTION } from '@c8y/ngx-components';
import { OAuthTFASwitchActionFactory } from './oauth-tfa-switch-action.factory';
import { HOOK_MICROSERVICE_ROLE } from '@services/fake-microservice.service';

@NgModule({
  imports: [CommonModule, CoreModule],
  providers: [
    { provide: HOOK_ACTION, useClass: OAuthTFASwitchActionFactory, multi: true },
    {
      provide: HOOK_MICROSERVICE_ROLE,
      useValue: ['ROLE_TENANT_ADMIN', 'ROLE_OPTION_MANAGEMENT_READ', 'ROLE_OPTION_MANAGEMENT_ADMIN'],
      multi: true
    }
  ]
})
export class OauthTfaSwitchModule {}
