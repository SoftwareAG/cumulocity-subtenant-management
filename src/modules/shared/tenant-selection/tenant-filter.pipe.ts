import { Pipe, PipeTransform } from '@angular/core';
import { ITenant } from '@c8y/client';

@Pipe({
  name: 'tenantFilter'
})
export class TenantFilterPipe implements PipeTransform {
  transform(tenants: ITenant[], searchString: string): ITenant[] {
    if (!tenants || !searchString) {
      return tenants;
    }

    searchString = searchString.toLocaleLowerCase();

    return tenants.filter((tenant) => {
      if (!tenant) {
        return false;
      }

      if (tenant.id && tenant.id.toLocaleLowerCase().includes(searchString)) {
        return true;
      }

      if (tenant.company && tenant.company.toLocaleLowerCase().includes(searchString)) {
        return true;
      }

      if (tenant.contactName && tenant.contactName.toLocaleLowerCase().includes(searchString)) {
        return true;
      }

      if (tenant.adminName && tenant.adminName.toLocaleLowerCase().includes(searchString)) {
        return true;
      }

      if (tenant.adminEmail && tenant.adminEmail.toLocaleLowerCase().includes(searchString)) {
        return true;
      }

      if (tenant.domain && tenant.domain.toLocaleLowerCase().includes(searchString)) {
        return true;
      }

      return false;
    });
  }
}
