import { Component } from '@angular/core';
import { Column, ColumnDataType } from '@c8y/ngx-components';
import { FirmwareStatisticsTableDatasourceService } from './firmware-statistics-table-datasource.service';

@Component({
  providers: [FirmwareStatisticsTableDatasourceService],
  selector: 'ps-firmware-statistics',
  templateUrl: './firmware-statistics.component.html'
})
export class FirmwareStatisticsComponent {
  columns: Column[];

  constructor(public datasource: FirmwareStatisticsTableDatasourceService) {
    this.columns = this.getDefaultColumns();
  }

  getDefaultColumns(): Column[] {
    return [
      {
        name: 'version',
        header: 'Firmware Version',
        path: 'version',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'count',
        header: 'Sum over all Tenants',
        path: 'count',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'percentage',
        header: 'Percentage',
        path: 'percentage',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      }
    ];
  }
}
