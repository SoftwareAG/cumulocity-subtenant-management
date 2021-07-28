import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { BsModalService } from 'ngx-bootstrap/modal';
import { TenantSelectionComponent } from './tenant-selection.component';
import { ITenant } from '@c8y/client';

@Injectable()
export class TenantSelectionService {
  constructor(private modalService: BsModalService) {}

  getTenantSelection(
    tenants: (string | ITenant)[],
    initialState?: Partial<TenantSelectionComponent>
  ): Promise<string[]> {
    const mappedTenants = tenants.map((tmp) => ({ name: typeof tmp === 'string' ? tmp : tmp.id }));
    const responseSubject = new Subject<{ name: string }[]>();
    const response = responseSubject
      .asObservable()
      .pipe(take(1))
      .toPromise()
      .then((res) => {
        if (!res || !res.length) {
          throw Error('Tenant Selection canceled or not tenant selected');
        }

        return res.map((tmp) => tmp.name);
      });

    const finalInitialState: Partial<TenantSelectionComponent> = { response: responseSubject, tenants: mappedTenants };
    if (initialState) {
      Object.assign(finalInitialState, initialState);
    }
    this.modalService.show(TenantSelectionComponent, {
      initialState: finalInitialState,
      ignoreBackdropClick: true
    });
    return response;
  }
}
