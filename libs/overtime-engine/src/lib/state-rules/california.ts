import { StateOvertimeRule } from '../types';

/**
 * California Overtime Rules:
 * - Daily OT: time-and-a-half after 8 hours in a workday
 * - Daily DT: double-time after 12 hours in a workday
 * - Weekly OT: time-and-a-half after 40 hours in a workweek
 * - 7th consecutive day: first 8 hours at time-and-a-half, after 8 at double-time
 */
export const californiaRule: StateOvertimeRule = {
  stateCode: 'CA',
  dailyOTThreshold: 8,
  dailyDTThreshold: 12,
  weeklyOTThreshold: 40,
  seventhDayRule: true,
};
