import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { CoreModule } from '@c8y/ngx-components';
import { TenantDetailsComponent } from './tenant-details/tenant-details.component';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    PopoverModule
  ],
  declarations: [TenantDetailsComponent],
  exports: [TenantDetailsComponent]
})
export class SharedModule { }
