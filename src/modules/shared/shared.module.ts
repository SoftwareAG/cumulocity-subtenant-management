import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { CoreModule } from '@c8y/ngx-components';
import { TenantDetailsComponent } from './tenant-details/tenant-details.component';
import { TenantSelectionComponent } from './tenant-selection/tenant-selection.component';

@NgModule({
  imports: [CommonModule, CoreModule, PopoverModule],
  declarations: [TenantDetailsComponent, TenantSelectionComponent],
  entryComponents: [TenantSelectionComponent],
  exports: [TenantDetailsComponent, TenantSelectionComponent]
})
export class SharedModule {}
