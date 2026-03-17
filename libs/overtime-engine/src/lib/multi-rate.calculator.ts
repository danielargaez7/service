import { OTTimeEntry, OTPayRate, OvertimeResult } from './types';

/**
 * Multi-Rate Weighted Average Overtime Calculation
 *
 * When an employee works at multiple pay rates in the same week,
 * FLSA requires the weighted average method for OT calculation:
 *
 *   regularRate = totalEarnings / totalHours
 *   otPremium = regularRate × 0.5 × otHours
 *
 * The employee gets their full rate for all hours, then an additional
 * half-time premium on the OT hours at the blended rate.
 */
export function calculateMultiRateOT(
  entries: OTTimeEntry[],
  payRates: OTPayRate[],
  regularHours: number,
  overtimeHours: number,
  doubleTimeHours: number,
  calculationMethod: string,
  warnings: string[]
): OvertimeResult {
  // Calculate total straight-time earnings at each job's rate
  let totalEarnings = 0;
  let totalHours = 0;

  for (const entry of entries) {
    const rate = findApplicableRate(entry, payRates);
    if (!rate) {
      warnings.push(`No pay rate found for job type ${entry.jobType} on ${entry.clockIn.toISOString().slice(0, 10)}`);
      continue;
    }
    totalEarnings += entry.hoursWorked * rate.ratePerHour;
    totalHours += entry.hoursWorked;
  }

  if (totalHours === 0) {
    return emptyResult(calculationMethod, warnings);
  }

  // Weighted average regular rate
  const weightedRegularRate = totalEarnings / totalHours;

  // OT premium is half-time (employee already received straight-time for all hours)
  const otPremium = weightedRegularRate * 0.5 * overtimeHours;
  const dtPremium = weightedRegularRate * 1.0 * doubleTimeHours; // additional full-time for DT

  // Regular pay = straight-time for regular hours only
  const regularPay = regularHours * weightedRegularRate;

  // OT pay = straight-time for OT hours + half-time premium
  const overtimePay = overtimeHours * weightedRegularRate + otPremium;

  // DT pay = straight-time for DT hours + full-time premium
  const doubleTimePay = doubleTimeHours * weightedRegularRate + dtPremium;

  return {
    regularHours: round(regularHours),
    overtimeHours: round(overtimeHours),
    doubleTimeHours: round(doubleTimeHours),
    regularPay: round(regularPay),
    overtimePay: round(overtimePay),
    doubleTimePay: round(doubleTimePay),
    totalPay: round(regularPay + overtimePay + doubleTimePay),
    calculationMethod: `${calculationMethod} (weighted avg rate: $${weightedRegularRate.toFixed(2)}/hr)`,
    warnings,
  };
}

function findApplicableRate(
  entry: OTTimeEntry,
  payRates: OTPayRate[]
): OTPayRate | undefined {
  return payRates.find((r) => {
    if (r.jobType !== entry.jobType) return false;
    const entryDate = entry.clockIn;
    if (entryDate < r.effectiveFrom) return false;
    if (r.effectiveTo && entryDate > r.effectiveTo) return false;
    return true;
  });
}

function emptyResult(method: string, warnings: string[]): OvertimeResult {
  return {
    regularHours: 0,
    overtimeHours: 0,
    doubleTimeHours: 0,
    regularPay: 0,
    overtimePay: 0,
    doubleTimePay: 0,
    totalPay: 0,
    calculationMethod: method,
    warnings,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
