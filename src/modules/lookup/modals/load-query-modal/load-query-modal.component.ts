import { Component, OnInit } from '@angular/core';
import { Client, FetchClient, IManagedObject, ITenantOption, TenantOptionsService } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { TenantSpecificDetails } from '@models/tenant-specific-details';
import { FakeMicroserviceService } from '@services/fake-microservice.service';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { startCase } from 'lodash-es';
import { Subject } from 'rxjs';

@Component({
  selector: 'ps-load-query-modal',
  templateUrl: './load-query-modal.component.html'
})
export class LoadQueryModalComponent implements OnInit {
  response: Subject<string>;
  storedQueries: ITenantOption[] = [];
  queryType = 'inventory';
  selectedQuery: ITenantOption;
  isLoading = true;

  constructor(
    private bsModalRef: BsModalRef,
    private alertService: AlertService,
    private tenantOptions: TenantOptionsService,
    private fetchClient: FetchClient,
    private fakeMicroService: FakeMicroserviceService
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.getTenantOptions().then(
      (result) => {
        const filteredQueries = result.filter((entry) => entry.key.startsWith(`${this.queryType}_`));
        const renamedQueries = filteredQueries.map((tmp) => {
          tmp.key = startCase(tmp.key.replace(`${this.queryType}_`, ''));
          return tmp;
        });
        this.storedQueries = renamedQueries;
        this.isLoading = false;
      },
      (error) => {
        this.storedQueries = [];
        this.isLoading = false;
      }
    );
  }

  async getTenantOptions(): Promise<ITenantOption[]> {
    const appName = await this.fakeMicroService.getMsName();
    return this.fetchClient.fetch(`/tenant/options/${appName}?pageSize=1000`).then((result) => {
      if (result.status === 200) {
        return result.json().then((json) => {
          const obj = json as { [key: string]: string };
          return Object.keys(obj).map((key) => {
            return {
              category: appName,
              key,
              value: obj[key]
            } as ITenantOption;
          });
        });
      } else {
        return Promise.reject();
      }
    });
  }

  onDismiss(event: any) {
    if (this.response) {
      this.response.next('');
    }
    this.bsModalRef.hide();
  }

  onSave(event: any) {
    if (this.response) {
      this.response.next(this.selectedQuery.value);
    }
    this.bsModalRef.hide();
  }
}
