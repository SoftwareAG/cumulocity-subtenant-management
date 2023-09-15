import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { hookAction } from '@c8y/ngx-components';
import { CleanupActionFactory } from './cleanup-action.factory';

@NgModule({
  imports: [CommonModule],
  declarations: [],
  providers: [hookAction(CleanupActionFactory)]
})
export class CleanupModule {}
