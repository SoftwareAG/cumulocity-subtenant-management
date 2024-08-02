import { Injectable } from '@angular/core';
import { Client, FetchClient, IFetchOptions, IFetchResponse } from '@c8y/client';
import { EplRule } from '@models/EplRule';

@Injectable()
export class EplService {
  constructor(private fetch: FetchClient) {}

  GET_OPTIONS: IFetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  POST_OPTIONS: IFetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  async getEplFiles() {
    const response = await this.fetch.fetch('service/cep/eplfiles?contents=true', this.GET_OPTIONS);
    return response.json();
  }

  deployToAllTenants(rule: EplRule, clients: Client[]): Promise<IFetchResponse[]> {
    const promArray = clients.map((client) => this.deployToTenant(rule, client));
    return Promise.all(promArray);
  }

  deployToTenant(rule: EplRule, client: Client) {
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.com.nsn.cumulocity.applicationReference+json',
        Accept: 'application/vnd.com.nsn.cumulocity.applicationReference+json'
      },
      body: JSON.stringify({
        name: rule.name,
        description: rule.description,
        state: rule.state,
        contents: rule.contents
      })
    };
    return client.core.fetch('service/cep/eplfiles', options);
  }

  removeFromAllTenants(rule: EplRule, clients: Client[]): Promise<IFetchResponse[]> {
    const promArray = clients.map((client) => this.removeFromTenant(rule, client));
    return Promise.all(promArray);
  }

  async removeFromTenant(rule: EplRule, client: Client) {
    const tenantRule = await this.checkIfEplRuleIsAvailable(rule, client);
    if (tenantRule) {
      const options: RequestInit = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/vnd.com.nsn.cumulocity.applicationReference+json',
          Accept: 'application/vnd.com.nsn.cumulocity.applicationReference+json'
        }
      };
      return client.core.fetch('service/cep/eplfiles/' + tenantRule.id, options);
    }
  }

  async checkIfEplRuleIsAvailable(rule: EplRule, client: Client): Promise<EplRule> {
    const response = await client.core.fetch('service/cep/eplfiles', this.GET_OPTIONS);
    if (response.status === 200) {
      const rules = await response.json();
      return rules.eplfiles.find((tmp) => tmp.name === rule.name);
    }
  }
}
