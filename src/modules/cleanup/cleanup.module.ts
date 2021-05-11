import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HOOK_ACTION } from '@c8y/ngx-components';
import { CleanupActionFactory } from './cleanup-action.factory';

@NgModule({
  imports: [CommonModule],
  declarations: [],
  providers: [{ provide: HOOK_ACTION, useClass: CleanupActionFactory, multi: true }]
})
export class CleanupModule {}
