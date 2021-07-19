import { Component } from '@angular/core';
import { Client, ITenant } from '@c8y/client';
import { AlertService, Column, ColumnDataType, ModalService } from '@c8y/ngx-components';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { StorageStatisticsTableDatasourceService } from './storage-statistics-table-datasource.service';

@Component({
  providers: [StorageStatisticsTableDatasourceService],
  selector: 'ps-storage-statistics',
  templateUrl: './storage-statistics.component.html'
})
export class StorageStatisticsComponent {
  columns: Column[];

  constructor(
    public datasource: StorageStatisticsTableDatasourceService,
    private credService: FakeMicroserviceService,
    private alertService: AlertService,
    private modalService: ModalService
  ) {
    this.columns = this.getDefaultColumns();
  }

  getDefaultColumns(): Column[] {
    return [
      {
        name: 'tenant',
        header: 'Tenant',
        path: 'id',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false
      },
      {
        name: 'measurementCount',
        header: 'measurementCount',
        path: 'measurementCount',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: false
      },
      {
        name: 'operationCount',
        header: 'operationCount',
        path: 'operationCount',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: false
      },
      {
        name: 'alarmCount',
        header: 'alarmCount',
        path: 'alarmCount',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: false
      },
      {
        name: 'eventCount',
        header: 'eventCount',
        path: 'eventCount',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: false
      },
      {
        name: 'inventoryCount',
        header: 'inventoryCount',
        path: 'inventoryCount',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: false
      },
      {
        name: 'inventoryBinaryCount',
        header: 'inventoryBinaryCount',
        path: 'inventoryBinaryCount',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: false
      },
      {
        name: 'binarySizeSum',
        header: 'binarySizeSum (first 2000 files)',
        path: 'binarySizeSum',
        dataType: ColumnDataType.TextShort,
        sortable: false,
        filterable: false,
        visible: false
      },
      {
        header: 'Actions',
        name: 'actions1',
        sortable: false
      }
    ];
  }

  cleanupReports(tenant: Partial<ITenant>): void {
    this.modalService
      .confirm(
        'Remove older Reports',
        'Are you sure that you want to remove reports that are older than 14 days?',
        'danger'
      )
      .then(
        () => {
          this.credService.prepareCachedDummyMicroserviceForAllSubtenants().then((creds) => {
            const client = this.credService.createClients(creds.filter((tmp) => tmp.tenant === tenant.id))[0];
            this.deleteOldReports(client).then(
              (result) => {
                this.alertService.success(`Removed ${result} old Reports.`);
              },
              () => {
                this.alertService.success(`Failed to remove all old Reports.`);
              }
            );
          });
        },
        () => {
          // nothing to do.
        }
      );
  }

  private async deleteOldReports(client: Client): Promise<number> {
    let total = 0;
    const date = new Date();
    date.setDate(date.getDate() - 15);
    const filter = {
      pageSize: 2000,
      query: `has(c8y_IsBinary) and owner eq 'service_report-agent' and lastUpdated.date lt '${date.toISOString()}'`
    };
    let res = await client.inventory.list(filter);
    while (res.data.length) {
      const resArray = await Promise.all(res.data.map((entry) => client.inventoryBinary.delete(entry)));
      total += resArray.length;
      if (res.data.length < res.paging.pageSize) {
        break;
      }
      res = await client.inventory.list(filter);
    }
    return total;
  }
}
