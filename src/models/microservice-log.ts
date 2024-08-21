export interface IMicroserviceLog {
  dateFrom: string;
  dateTo: string;
  truncated: boolean;
  logs: string;
  instanceName?: string;
}
