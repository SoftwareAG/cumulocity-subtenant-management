export enum retentionDataTypes {
  'EVENT',
  'OPERATION',
  'BULK_OPERATION',
  'ALARM',
  'MEASUREMENT',
  'AUDIT',
  '*'
}

export interface IRetention {
  editable: boolean;
  dataType: string;
  fragmentType: string;
  id: string;
  source: string;
  type: string;
  maximumAge: number;
}
