import { IManagedObject } from '@c8y/client';

export interface ILastUpdated {
  date: {
    $date: string;
  };
  offset: number;
}

export interface IInstanceDetails {
  lastUpdated: ILastUpdated;
  memoryInBytes: number;
  scheduled: boolean;
  restarts: number;
  cpuInMillis: number;
}

export interface IApplicationStatus {
  lastUpdated: ILastUpdated;
  instances: {
    [instanceName: string]: IInstanceDetails;
  };
  details: {
    desired: number;
    aggregatedResources: {
      memory: string;
      cpu: string;
    };
    active: number;
    restarts: number;
  };
  status: string;
}

export interface IApplicationManagedObjectAdditions {
  c8y_Status: IApplicationStatus;
  applicationOwner: string;
  c8y_Subscriptions: {
    [tenantId: string]: IApplicationStatus;
  };
  applicationId: string;
  name: string;
  c8y_SupportedLogs?: string[];
}

export type IApplicationManagedObject = IManagedObject & IApplicationManagedObjectAdditions;
