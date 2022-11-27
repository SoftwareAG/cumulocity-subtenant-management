import { BasicAuth } from '@c8y/client';

export class CustomBasicAuth extends BasicAuth {
  getFetchOptions(options: any): any {
    options = super.getFetchOptions(options);
    if (options && options.headers && options.headers['X-XSRF-TOKEN']) {
      delete options.headers['X-XSRF-TOKEN'];
    }
    if (options && options.headers && options.headers['UseXBasic']) {
      delete options.headers['UseXBasic'];
    }
    return options;
  }
}
