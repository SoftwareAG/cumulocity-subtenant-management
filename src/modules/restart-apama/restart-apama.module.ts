import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule, hookAction } from '@c8y/ngx-components';
import { RestartApamaActionFactory } from './restart-apama-action.factory';
import { ModalModule } from 'ngx-bootstrap/modal';
import { HOOK_MICROSERVICE_ROLE } from '@services/fake-microservice.service';

@NgModule({
  imports: [CommonModule, CoreModule, ModalModule],
  declarations: [],
  providers: [
    hookAction(RestartApamaActionFactory),
    {
      provide: HOOK_MICROSERVICE_ROLE,
      useValue: ['ROLE_CEP_MANAGEMENT_ADMIN'],
      multi: true
    }
  ]
})
export class RestartApamaActionModule {}
