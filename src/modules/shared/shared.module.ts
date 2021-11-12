import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { CoreModule } from '@c8y/ngx-components';
import { TenantDetailsComponent } from './tenant-details/tenant-details.component';
import { TenantSelectionComponent } from './tenant-selection/tenant-selection.component';
import { ChartsModule, ThemeService } from 'ng2-charts';
import { BarChartComponent } from './bar-chart/bar-chart.component';
import { TenantSelectionService } from './tenant-selection/tenant-selection.service';

@NgModule({
  imports: [CommonModule, CoreModule, PopoverModule, ChartsModule],
  declarations: [TenantDetailsComponent, TenantSelectionComponent, BarChartComponent],
  entryComponents: [TenantSelectionComponent],
  exports: [TenantDetailsComponent, TenantSelectionComponent, BarChartComponent]
})
export class SharedModule {
  static forRoot(): ModuleWithProviders<SharedModule> {
    return {
      ngModule: SharedModule,
      providers: [ThemeService, TenantSelectionService]
    };
  }
}
