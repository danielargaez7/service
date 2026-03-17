import { calculateOvertime } from './flsa.calculator';
import { OvertimeInput, OTTimeEntry, OTPayRate } from './types';

function makeEntry(
  day: number,
  hours: number,
  jobType = 'RESIDENTIAL_SANITATION'
): OTTimeEntry {
  const clockIn = new Date(2026, 2, day, 6, 0, 0); // March 2026
  const clockOut = new Date(clockIn.getTime() + hours * 3600000);
  return {
    id: `entry-${day}`,
    clockIn,
    clockOut,
    hoursWorked: hours,
    jobType,
  };
}

function makeRate(jobType: string, rate: number): OTPayRate {
  return {
    jobType,
    ratePerHour: rate,
    effectiveFrom: new Date(2026, 0, 1),
    effectiveTo: undefined,
  };
}

describe('FLSA Weekly Overtime', () => {
  it('should calculate standard OT after 40 hours for non-exempt employee', () => {
    const input: OvertimeInput = {
      employeeId: 'emp-1',
      entries: [
        makeEntry(2, 9),  // Mon
        makeEntry(3, 9),  // Tue
        makeEntry(4, 9),  // Wed
        makeEntry(5, 9),  // Thu
        makeEntry(6, 9),  // Fri — total 45hrs
      ],
      payRates: [makeRate('RESIDENTIAL_SANITATION', 25)],
      employeeClass: 'NON_CDL',
      stateCode: 'TX', // No daily OT
      isMotorCarrierExempt: false,
    };

    const result = calculateOvertime(input);
    expect(result.regularHours).toBe(40);
    expect(result.overtimeHours).toBe(5);
    expect(result.regularPay).toBe(1000); // 40 * $25
    expect(result.overtimePay).toBe(187.5); // 5 * $25 * 1.5
    expect(result.totalPay).toBe(1187.5);
  });

  it('should NOT calculate OT for Motor Carrier exempt employee', () => {
    const input: OvertimeInput = {
      employeeId: 'emp-2',
      entries: [
        makeEntry(2, 10),
        makeEntry(3, 10),
        makeEntry(4, 10),
        makeEntry(5, 10),
        makeEntry(6, 10), // 50hrs total
      ],
      payRates: [makeRate('RESIDENTIAL_SANITATION', 30)],
      employeeClass: 'CDL_A',
      stateCode: 'TX',
      isMotorCarrierExempt: true,
    };

    const result = calculateOvertime(input);
    expect(result.regularHours).toBe(50);
    expect(result.overtimeHours).toBe(0);
    expect(result.totalPay).toBe(1500); // 50 * $30, no OT premium
    expect(result.calculationMethod).toContain('Motor Carrier Act exempt');
  });

  it('should apply California daily OT after 8 hours', () => {
    const input: OvertimeInput = {
      employeeId: 'emp-3',
      entries: [
        makeEntry(2, 10), // Mon: 8 regular + 2 OT
        makeEntry(3, 8),  // Tue: 8 regular
        makeEntry(4, 8),  // Wed: 8 regular
        makeEntry(5, 8),  // Thu: 8 regular
        makeEntry(6, 6),  // Fri: 6 regular — total 40hrs, but 2hrs daily OT
      ],
      payRates: [makeRate('RESIDENTIAL_SANITATION', 20)],
      employeeClass: 'NON_CDL',
      stateCode: 'CA',
      isMotorCarrierExempt: false,
    };

    const result = calculateOvertime(input);
    expect(result.overtimeHours).toBe(2); // 2hrs daily OT from Monday
    expect(result.regularHours).toBe(38);
    expect(result.calculationMethod).toContain('CA');
  });

  it('should apply double-time after 12 hours in California', () => {
    const input: OvertimeInput = {
      employeeId: 'emp-4',
      entries: [
        makeEntry(2, 14), // Mon: 8 regular + 4 OT + 2 DT
        makeEntry(3, 6),  // Tue: 6 regular
      ],
      payRates: [makeRate('SEPTIC_PUMP', 28)],
      employeeClass: 'NON_CDL',
      stateCode: 'CA',
      isMotorCarrierExempt: false,
    };

    const result = calculateOvertime(input);
    expect(result.regularHours).toBe(14); // 8 + 6
    expect(result.overtimeHours).toBe(4); // 12 - 8
    expect(result.doubleTimeHours).toBe(2); // 14 - 12
    expect(result.doubleTimePay).toBe(112); // 2 * $28 * 2.0
  });

  it('should use weighted average for multi-rate weeks', () => {
    const input: OvertimeInput = {
      employeeId: 'emp-5',
      entries: [
        makeEntry(2, 10, 'RESIDENTIAL_SANITATION'),
        makeEntry(3, 10, 'RESIDENTIAL_SANITATION'),
        makeEntry(4, 10, 'SEPTIC_PUMP'),
        makeEntry(5, 10, 'SEPTIC_PUMP'),
        makeEntry(6, 5, 'RESIDENTIAL_SANITATION'), // total 45hrs
      ],
      payRates: [
        makeRate('RESIDENTIAL_SANITATION', 20),
        makeRate('SEPTIC_PUMP', 30),
      ],
      employeeClass: 'NON_CDL',
      stateCode: 'TX',
      isMotorCarrierExempt: false,
    };

    const result = calculateOvertime(input);
    expect(result.overtimeHours).toBe(5);
    expect(result.calculationMethod).toContain('Multi-rate weighted average');
    // Weighted rate: (25*$20 + 20*$30) / 45 = (500+600)/45 = $24.44/hr
    // OT premium: $24.44 * 0.5 * 5 = $61.11
    expect(result.totalPay).toBeGreaterThan(0);
  });

  it('should apply CBA override when stricter than FLSA', () => {
    const input: OvertimeInput = {
      employeeId: 'emp-6',
      entries: [
        makeEntry(2, 8),
        makeEntry(3, 8),
        makeEntry(4, 8),
        makeEntry(5, 8),
        makeEntry(6, 7), // total 39hrs
      ],
      payRates: [makeRate('RESIDENTIAL_SANITATION', 25)],
      employeeClass: 'NON_CDL',
      stateCode: 'TX',
      cbAgreementId: 'teamsters-local-455', // 37.5hr threshold
      isMotorCarrierExempt: false,
    };

    const result = calculateOvertime(input);
    // CBA: OT after 37.5hrs
    expect(result.overtimeHours).toBe(1.5);
    expect(result.regularHours).toBe(37.5);
    expect(result.calculationMethod).toContain('CBA override');
  });

  it('should return zero hours for empty entries', () => {
    const input: OvertimeInput = {
      employeeId: 'emp-7',
      entries: [],
      payRates: [makeRate('RESIDENTIAL_SANITATION', 25)],
      employeeClass: 'NON_CDL',
      stateCode: 'TX',
      isMotorCarrierExempt: false,
    };

    const result = calculateOvertime(input);
    expect(result.regularHours).toBe(0);
    expect(result.overtimeHours).toBe(0);
    expect(result.totalPay).toBe(0);
  });
});
