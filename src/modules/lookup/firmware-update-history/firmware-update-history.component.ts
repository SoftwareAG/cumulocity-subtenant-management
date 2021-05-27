import { Component } from '@angular/core';
import { IOperation } from '@c8y/client';
import { Column, ColumnDataType } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { get } from 'lodash';
import { FirmwareUpdateHistoryTableDatasourceService } from './firmware-update-history-table-datasource.service';

@Component({
  providers: [FirmwareUpdateHistoryTableDatasourceService],
  selector: 'ps-firmware-update-history',
  templateUrl: './firmware-update-history.component.html'
})
export class FirmwareUpdateHistoryComponent {
  columns: Column[];

  constructor(
    public datasource: FirmwareUpdateHistoryTableDatasourceService,
    private credService: FakeMicroserviceService
  ) {
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
        filterable: true
      },
      {
        name: 'firmwareName',
        header: 'Firmware Name',
        path: 'data.c8y_Firmware.name',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
      },
      {
        name: 'firmwareVersion',
        header: 'Firmware Version',
        path: 'data.c8y_Firmware.version',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
      },
      {
        name: 'firmwareURL',
        header: 'Firmware URL',
        path: 'data.c8y_Firmware.url',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
      },
      {
        name: 'description',
        header: 'Description',
        path: 'data.description',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true,
        visible: false
      },
      {
        name: 'failureReason',
        header: 'Failure Reason',
        path: 'data.failureReason',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
      },
      {
        name: 'creationTime',
        header: 'Creation Time',
        path: 'data.creationTime',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        sortOrder: 'desc'
      },
      {
        name: 'status',
        header: 'Status',
        path: 'data.status',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: true
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

  async openFirmwareLinkWithCreds(context: TenantSpecificDetails<IOperation>): Promise<void> {
    try {
      const url: string = get(context, 'data.c8y_Firmware.url');
      const credentials = await this.credService.prepareCachedDummyMicroserviceForAllSubtenants();
      const creds = credentials.find((tmp) => tmp.tenant === context.tenantId);
      if (creds) {
        const urlObj = new URL(url);
        urlObj.username = `${creds.tenant}/${creds.user}`;
        urlObj.password = creds.password;
        window.open(urlObj.toString());
      }
    } catch (e) {
      console.error(e);
    }
  }
}
