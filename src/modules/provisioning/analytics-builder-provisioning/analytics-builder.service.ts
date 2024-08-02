import { Injectable } from '@angular/core';
import { Client, FetchClient, IFetchOptions, IFetchResponse } from '@c8y/client';
import { AnalyticsBuilderModel } from '@models/analytics-builder-model';

@Injectable()
export class AnalyticsBuilderService {
  constructor(private fetch: FetchClient) {}

  GET_OPTIONS: IFetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  async fetchAnalyticsBuilder() {
    const response = await this.fetch.fetch('service/cep/analyticsbuilder', this.GET_OPTIONS);
    return response.json();
  }

  createModelAtAllTenants(model: AnalyticsBuilderModel, clients: Client[]) {
    const promArray = clients.map((client) => this.createAtTenant(model, client));
    return Promise.all(promArray);
  }

  createAtTenant(model: AnalyticsBuilderModel, client: Client) {
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.com.nsn.cumulocity.applicationReference+json',
        Accept: 'application/vnd.com.nsn.cumulocity.applicationReference+json'
      },
      body: JSON.stringify(model)
    };
    return client.core.fetch('/service/cep/analyticsbuilder', options);
  }

  removeFromAllTenants(model: AnalyticsBuilderModel, clients: Client[]): Promise<IFetchResponse[]> {
    const promArray = clients.map((client) => this.removeFromTenant(model, client));
    return Promise.all(promArray);
  }

  async removeFromTenant(model: AnalyticsBuilderModel, client: Client) {
    const tenantModel = await this.checkIfAnalyticsBuilderModelIsAvailable(model, client);
    if (tenantModel) {
      const options: RequestInit = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/vnd.com.nsn.cumulocity.applicationReference+json',
          Accept: 'application/vnd.com.nsn.cumulocity.applicationReference+json'
        }
      };
      return client.core.fetch('/service/cep/analyticsbuilder/' + tenantModel.id, options);
    }
  }

  async checkIfAnalyticsBuilderModelIsAvailable(
    model: AnalyticsBuilderModel,
    client: Client
  ): Promise<AnalyticsBuilderModel> {
    const response = await client.core.fetch('/service/cep/analyticsbuilder', this.GET_OPTIONS);
    if (response.status === 200) {
      const models = await response.json();
      return models.analyticsBuilderModelRepresentations.find((tmp) => tmp.name === model.name);
    } else {
      console.warn('Model :' + model.name + ' not found in tenant: ' + client.core.tenant);
      return null;
    }
  }
}
