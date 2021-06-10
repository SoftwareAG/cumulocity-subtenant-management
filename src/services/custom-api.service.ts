import { Injectable } from '@angular/core';
import { ApiService, ApiCallOptions } from '@c8y/ngx-components/api';
import { Client, FetchClient, IFetchOptions } from '@c8y/client';

/**
 * Customized version of the c8y ApiService to also show loading indicator for custom created c8y clients.
 */
@Injectable()
export class CustomApiService extends ApiService {
  constructor(private client1: FetchClient) {
    super(client1);
  }

  /**
   * Pushes calls made by provided client parameter also into the calls observable, causing the loading indicator to also be shown for those calls.
   */
  hookIntoCustomClientFetch(client: Client): void {
    const fetch = client.core.fetch.bind(client.core);
    client.core.fetch = async (url, options: ApiCallOptions & IFetchOptions = { method: 'GET' }) => {
      const { method } = options;
      this.onStart({ options, method, url });
      let fetchPromise = fetch(url, options);
      if (typeof options.responseInterceptor === 'function') {
        fetchPromise = fetchPromise.then(options.responseInterceptor);
      }
      fetchPromise.then(
        (response: Response) => this.onFinish({ response, url, options, method }),
        (response: Response) => this.onFinish({ response, url, options, method })
      );
      return fetchPromise;
    };
  }
}
