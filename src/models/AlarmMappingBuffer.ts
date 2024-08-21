import { IAlarm, SeverityType } from '@c8y/client';

export interface IAlarmMappingBuffer {
  alarm: Partial<IAlarm>;
  type: string;
  severity: SeverityType;
  text: string;
  enabled?: boolean;
}
