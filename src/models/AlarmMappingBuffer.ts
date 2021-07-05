import { IAlarm, Severity } from '@c8y/client';

export interface IAlarmMappingBuffer {
  alarm: Partial<IAlarm>;
  type: string;
  severity: Severity;
  text: string;
  enabled?: boolean;
}
