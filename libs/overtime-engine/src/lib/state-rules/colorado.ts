import { StateOvertimeRule } from '../types';

/**
 * Colorado Overtime Rules (COMPS Order):
 * - Daily OT: time-and-a-half after 12 hours in a workday
 * - Weekly OT: time-and-a-half after 40 hours in a workweek
 * - No double-time provision
 */
export const coloradoRule: StateOvertimeRule = {
  stateCode: 'CO',
  dailyOTThreshold: 12,
  dailyDTThreshold: null,
  weeklyOTThreshold: 40,
  seventhDayRule: false,
};
