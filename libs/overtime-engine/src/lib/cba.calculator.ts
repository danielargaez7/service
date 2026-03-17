import { OTTimeEntry } from './types';

/**
 * Collective Bargaining Agreement (CBA) Override Calculator
 *
 * Teamsters and other union contracts may specify overtime rules
 * that are stricter than (or different from) FLSA. CBA rules always
 * take precedence when they provide greater benefit to the employee.
 */

export interface CBAOverrideResult {
  weeklyOTThreshold: number;
  dailyOTThreshold: number | null;
  warnings: string[];
}

// CBA configurations — in production, these would come from a database
const CBA_CONFIGS: Record<string, CBAOverrideResult> = {
  'teamsters-local-455': {
    weeklyOTThreshold: 37.5,
    dailyOTThreshold: 8,
    warnings: ['Teamsters Local 455: weekly OT threshold is 37.5hrs, daily OT after 8hrs'],
  },
  'teamsters-local-117': {
    weeklyOTThreshold: 40,
    dailyOTThreshold: 10,
    warnings: ['Teamsters Local 117: daily OT after 10hrs'],
  },
};

export function applyCBAOverrides(
  cbAgreementId: string,
  _entries: OTTimeEntry[]
): CBAOverrideResult | null {
  const config = CBA_CONFIGS[cbAgreementId.toLowerCase()];
  if (!config) {
    return null;
  }
  return { ...config };
}
