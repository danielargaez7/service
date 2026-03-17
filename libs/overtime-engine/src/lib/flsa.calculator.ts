import {
  OvertimeInput,
  OvertimeResult,
  OTTimeEntry,
  OTPayRate,
  DailyHours,
} from './types';
import { getStateRule } from './state-rules/index';
import { isMotorCarrierExempt } from './motor-carrier.calculator';
import { applyCBAOverrides } from './cba.calculator';
import { calculateMultiRateOT } from './multi-rate.calculator';

const FLSA_WEEKLY_OT_THRESHOLD = 40;
const OT_MULTIPLIER = 1.5;
const DT_MULTIPLIER = 2.0;

/**
 * Main overtime calculation entry point.
 *
 * Calculation order (per PRD — do not change):
 * 1. Check Motor Carrier Act exemption → if exempt, skip federal OT
 * 2. Apply CBA overrides → may be stricter than FLSA
 * 3. Apply state daily OT rules (e.g., California: OT after 8hrs/day, DT after 12hrs)
 * 4. Apply FLSA weekly OT (40hr threshold) for non-exempt employees
 * 5. For multi-rate weeks: weighted average method
 */
export function calculateOvertime(input: OvertimeInput): OvertimeResult {
  const warnings: string[] = [];
  const methods: string[] = [];

  // Step 1: Motor Carrier Act exemption check
  if (input.isMotorCarrierExempt && isMotorCarrierExempt(input.employeeClass)) {
    methods.push('Motor Carrier Act exempt — no federal OT');
    return buildExemptResult(input, methods, warnings);
  }

  // Step 2: Check for CBA overrides
  const cbaOverride = input.cbAgreementId
    ? applyCBAOverrides(input.cbAgreementId, input.entries)
    : null;

  if (cbaOverride) {
    methods.push(`CBA override applied: ${input.cbAgreementId}`);
    if (cbaOverride.warnings) {
      warnings.push(...cbaOverride.warnings);
    }
  }

  // Step 3: State daily OT rules
  const stateRule = getStateRule(input.stateCode);
  const dailyBreakdown = groupEntriesByDay(input.entries);

  let totalRegularHours = 0;
  let totalOTHours = 0;
  let totalDTHours = 0;

  if (stateRule && stateRule.dailyOTThreshold !== null) {
    methods.push(`State rule: ${input.stateCode} (daily OT after ${stateRule.dailyOTThreshold}hrs)`);

    for (const day of dailyBreakdown) {
      const { regular, overtime, doubletime } = calculateDailyHours(
        day.totalHours,
        stateRule.dailyOTThreshold,
        stateRule.dailyDTThreshold
      );
      totalRegularHours += regular;
      totalOTHours += overtime;
      totalDTHours += doubletime;
    }

    // Step 4: FLSA weekly OT on top of state (only for hours not already OT/DT)
    const weeklyOTThreshold = cbaOverride?.weeklyOTThreshold ?? FLSA_WEEKLY_OT_THRESHOLD;
    if (totalRegularHours > weeklyOTThreshold) {
      const additionalOT = totalRegularHours - weeklyOTThreshold;
      totalRegularHours = weeklyOTThreshold;
      totalOTHours += additionalOT;
      methods.push(`FLSA weekly OT: ${additionalOT.toFixed(2)}hrs over ${weeklyOTThreshold}hr threshold`);
    }
  } else {
    // No daily OT state — just FLSA weekly
    const totalHours = dailyBreakdown.reduce((sum, d) => sum + d.totalHours, 0);
    const weeklyOTThreshold = cbaOverride?.weeklyOTThreshold ?? FLSA_WEEKLY_OT_THRESHOLD;

    totalRegularHours = Math.min(totalHours, weeklyOTThreshold);
    totalOTHours = Math.max(0, totalHours - weeklyOTThreshold);
    methods.push(`FLSA weekly OT: ${weeklyOTThreshold}hr threshold`);
  }

  // Step 5: Calculate pay — multi-rate or single rate
  const uniqueRates = getUniqueRatesUsed(input.entries, input.payRates);

  if (uniqueRates.length > 1) {
    methods.push('Multi-rate weighted average method');
    return calculateMultiRateOT(
      input.entries,
      input.payRates,
      totalRegularHours,
      totalOTHours,
      totalDTHours,
      methods.join(' → '),
      warnings
    );
  }

  // Single rate calculation
  const rate = uniqueRates[0]?.ratePerHour ?? 0;
  if (rate === 0) {
    warnings.push('No pay rate found for employee — defaulting to $0');
  }

  const regularPay = totalRegularHours * rate;
  const overtimePay = totalOTHours * rate * OT_MULTIPLIER;
  const doubleTimePay = totalDTHours * rate * DT_MULTIPLIER;

  return {
    regularHours: round(totalRegularHours),
    overtimeHours: round(totalOTHours),
    doubleTimeHours: round(totalDTHours),
    regularPay: round(regularPay),
    overtimePay: round(overtimePay),
    doubleTimePay: round(doubleTimePay),
    totalPay: round(regularPay + overtimePay + doubleTimePay),
    calculationMethod: methods.join(' → '),
    warnings,
  };
}

function buildExemptResult(
  input: OvertimeInput,
  methods: string[],
  warnings: string[]
): OvertimeResult {
  const totalHours = input.entries.reduce((sum, e) => sum + e.hoursWorked, 0);
  const rate = getUniqueRatesUsed(input.entries, input.payRates)[0]?.ratePerHour ?? 0;

  return {
    regularHours: round(totalHours),
    overtimeHours: 0,
    doubleTimeHours: 0,
    regularPay: round(totalHours * rate),
    overtimePay: 0,
    doubleTimePay: 0,
    totalPay: round(totalHours * rate),
    calculationMethod: methods.join(' → '),
    warnings,
  };
}

export function groupEntriesByDay(entries: OTTimeEntry[]): DailyHours[] {
  const dayMap = new Map<string, DailyHours>();

  for (const entry of entries) {
    const dateKey = entry.clockIn.toISOString().slice(0, 10);
    const existing = dayMap.get(dateKey);
    if (existing) {
      existing.totalHours += entry.hoursWorked;
      existing.entries.push(entry);
    } else {
      dayMap.set(dateKey, {
        date: dateKey,
        totalHours: entry.hoursWorked,
        entries: [entry],
      });
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateDailyHours(
  totalHours: number,
  otThreshold: number,
  dtThreshold: number | null
): { regular: number; overtime: number; doubletime: number } {
  if (dtThreshold !== null && totalHours > dtThreshold) {
    return {
      regular: otThreshold,
      overtime: dtThreshold - otThreshold,
      doubletime: totalHours - dtThreshold,
    };
  }

  if (totalHours > otThreshold) {
    return {
      regular: otThreshold,
      overtime: totalHours - otThreshold,
      doubletime: 0,
    };
  }

  return { regular: totalHours, overtime: 0, doubletime: 0 };
}

function getUniqueRatesUsed(
  entries: OTTimeEntry[],
  payRates: OTPayRate[]
): OTPayRate[] {
  const jobTypes = new Set(entries.map((e) => e.jobType));
  return payRates.filter((r) => jobTypes.has(r.jobType));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
