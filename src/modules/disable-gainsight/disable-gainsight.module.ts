import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule, hookAction } from '@c8y/ngx-components';
import { DisableGainsightActionFactory } from './disable-gainsight-action.factory';
import { ModalModule } from 'ngx-bootstrap/modal';

@NgModule({
  imports: [CommonModule, CoreModule, ModalModule],
  declarations: [],
  providers: [hookAction(DisableGainsightActionFactory)]
})
export class DisableGainsightActionModule {}
