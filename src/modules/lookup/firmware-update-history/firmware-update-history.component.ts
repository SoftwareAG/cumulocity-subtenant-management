import { Component } from '@angular/core';
import { Column, ColumnDataType } from '@c8y/ngx-components';
import { FirmwareUpdateHistoryTableDatasourceService } from './firmware-update-history-table-datasource.service';

@Component({
  providers: [FirmwareUpdateHistoryTableDatasourceService],
  selector: 'ps-firmware-update-history',
  templateUrl: './firmware-update-history.component.html'
})
export class FirmwareUpdateHistoryComponent {
  columns: Column[];

  constructor(public datasource: FirmwareUpdateHistoryTableDatasourceService) {
    this.columns = this.getDefaultColumns();
  }

  getDefaultColumns(): Column[] {
    return [
      {
        name: 'tenant',
        header: 'Tenant Id',
        path: 'tenantId',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
      },
      {
        name: 'deviceName',
        header: 'Device Name',
        path: 'data.deviceName',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'firmwareName',
        header: 'Firmware Name',
        path: 'data.c8y_Firmware.name',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'firmwareVersion',
        header: 'Firmware Version',
        path: 'data.c8y_Firmware.version',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'firmwareURL',
        header: 'Firmware URL',
        path: 'data.c8y_Firmware.url',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'description',
        header: 'Description',
        path: 'data.description',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: false
      },
      {
        name: 'failureReason',
        header: 'Failure Reason',
        path: 'data.failureReason',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'creationTime',
        header: 'Creation Time',
        path: 'data.creationTime',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'status',
        header: 'Status',
        path: 'data.status',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      }
      // {
      //   header: 'Actions',
      //   name: 'actions1',
      //   sortable: false,
      //   filterable: false,
      //   visible: false
      // }
    ];
  }
}
