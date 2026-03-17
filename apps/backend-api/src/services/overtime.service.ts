import {
  OvertimeResult,
  PayRate,
  TimeEntry,
  EmployeeClass,
} from '@servicecore/shared-models';
import { calculateOvertime, type OvertimeInput as EngineInput } from '@servicecore/overtime-engine';

interface OvertimeContext {
  employeeClass: EmployeeClass;
  stateCode: string;
  cbAgreementId?: string;
  isMotorCarrierExempt: boolean;
}

function hoursWorked(entry: TimeEntry): number {
  if (!entry.clockOut) return 0;
  const ms = entry.clockOut.getTime() - entry.clockIn.getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

export class OvertimeService {
  calculateForEntries(
    employeeId: string,
    entries: TimeEntry[],
    payRates: PayRate[],
    context: OvertimeContext
  ): OvertimeResult {
    const engineInput: EngineInput = {
      employeeId,
      entries: entries.map((entry) => ({
        id: entry.id,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut ?? entry.clockIn,
        jobType: entry.jobType,
        hoursWorked: hoursWorked(entry),
      })),
      payRates: payRates.map((rate) => ({
        jobType: rate.jobType,
        ratePerHour: rate.ratePerHour,
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo ?? undefined,
      })),
      employeeClass: context.employeeClass,
      stateCode: context.stateCode,
      cbAgreementId: context.cbAgreementId,
      isMotorCarrierExempt: context.isMotorCarrierExempt,
    };

    return calculateOvertime(engineInput);
  }
}
