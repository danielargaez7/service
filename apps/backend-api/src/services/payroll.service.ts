import prisma from '../prisma';
import { OvertimeService } from './overtime.service';
import { timesheetService } from './timesheet.service';
import { getFormatter, type PayrollExportRow } from './payroll-formatters/index';

const overtimeService = new OvertimeService();

export interface PayrollPreviewRow {
  employeeId: string;
  employeeName: string;
  email: string;
  employeeClass: string;
  stateCode: string;
  periodStart: string;
  periodEnd: string;
  entryCount: number;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  regularPay: number;
  overtimePay: number;
  doubleTimePay: number;
  totalPay: number;
  calculationMethod: string;
  warnings: string[];
  hourlyRate: number;
}

export class PayrollService {
  async generatePreview(
    periodStart: Date,
    periodEnd: Date,
    employeeIds?: string[]
  ): Promise<PayrollPreviewRow[]> {
    // Fetch approved entries in the period
    const entries = await timesheetService.findByDateRange(
      periodStart,
      periodEnd,
      ['APPROVED', 'SUBMITTED']
    );

    // Filter by employee IDs if provided
    const filtered = employeeIds
      ? entries.filter((e) => employeeIds.includes(e.employeeId))
      : entries;

    // Group entries by employee
    const byEmployee = new Map<string, typeof filtered>();
    for (const entry of filtered) {
      const existing = byEmployee.get(entry.employeeId) ?? [];
      existing.push(entry);
      byEmployee.set(entry.employeeId, existing);
    }

    const results: PayrollPreviewRow[] = [];

    for (const [employeeId, empEntries] of byEmployee) {
      const employee = empEntries[0].employee;
      if (!employee) continue;

      // Fetch pay rates
      const payRates = await prisma.payRate.findMany({
        where: {
          employeeId,
          effectiveFrom: { lte: periodEnd },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: periodStart } },
          ],
        },
      });

      // Use the primary (highest) rate as the display rate
      const primaryRate = payRates.length > 0
        ? Math.max(...payRates.map((pr) => Number(pr.ratePerHour)))
        : 0;

      // Run overtime calculation
      const otResult = overtimeService.calculateForEntries(
        employeeId,
        empEntries.map((e) => ({
          id: e.id,
          employeeId: e.employeeId,
          clockIn: e.clockIn,
          clockOut: e.clockOut,
          jobType: e.jobType as any,
          gpsIn: null,
          gpsOut: null,
          photoInUrl: null,
          photoOutUrl: null,
          status: e.status as any,
          approvedById: e.approvedBy,
          approvedAt: e.approvedAt,
          flagReason: e.flagReason,
          notes: e.notes,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        })),
        payRates.map((pr) => ({
          id: pr.id,
          employeeId: pr.employeeId,
          jobType: pr.jobType as any,
          ratePerHour: Number(pr.ratePerHour),
          effectiveFrom: pr.effectiveFrom,
          effectiveTo: pr.effectiveTo,
        })),
        {
          employeeClass: employee.employeeClass as any,
          stateCode: employee.stateCode,
          cbAgreementId: employee.cbAgreementId ?? undefined,
          isMotorCarrierExempt: employee.isMotorCarrier,
        }
      );

      results.push({
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        employeeClass: employee.employeeClass,
        stateCode: employee.stateCode,
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        entryCount: empEntries.length,
        regularHours: otResult.regularHours,
        overtimeHours: otResult.overtimeHours,
        doubleTimeHours: otResult.doubleTimeHours,
        regularPay: otResult.regularPay,
        overtimePay: otResult.overtimePay,
        doubleTimePay: otResult.doubleTimePay,
        totalPay: otResult.totalPay,
        calculationMethod: otResult.calculationMethod,
        warnings: otResult.warnings,
        hourlyRate: primaryRate,
      });
    }

    return results.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }

  async exportPayroll(
    periodStart: Date,
    periodEnd: Date,
    format: string,
    exportedBy: string,
    employeeIds?: string[]
  ): Promise<{ csv: string; filename: string; contentType: string } | { json: PayrollPreviewRow[] }> {
    const preview = await this.generatePreview(periodStart, periodEnd, employeeIds);

    // JSON format — return the preview data directly
    if (format === 'JSON') {
      return { json: preview };
    }

    // Get the formatter
    const formatter = getFormatter(format);
    if (!formatter) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    // Map preview rows to export rows
    const exportRows: PayrollExportRow[] = preview.map((row) => ({
      employeeId: row.employeeId,
      firstName: row.employeeName.split(' ')[0],
      lastName: row.employeeName.split(' ').slice(1).join(' '),
      email: row.email,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      regularHours: row.regularHours,
      overtimeHours: row.overtimeHours,
      doubleTimeHours: row.doubleTimeHours,
      regularPay: row.regularPay,
      overtimePay: row.overtimePay,
      doubleTimePay: row.doubleTimePay,
      totalPay: row.totalPay,
      hourlyRate: row.hourlyRate,
      department: row.employeeClass,
      jobTitle: row.employeeClass,
      stateCode: row.stateCode,
    }));

    const csv = formatter.generate(exportRows);
    const dateStr = periodEnd.toISOString().split('T')[0].replace(/-/g, '');
    const filename = `payroll-${format.toLowerCase()}-${dateStr}${formatter.fileExtension}`;

    // Mark exported entries and audit
    const allEntryIds = await this.getEntryIdsForPeriod(periodStart, periodEnd, employeeIds);
    if (allEntryIds.length > 0) {
      await timesheetService.markExported(allEntryIds, exportedBy);
    }

    return { csv, filename, contentType: formatter.contentType };
  }

  private async getEntryIdsForPeriod(
    periodStart: Date,
    periodEnd: Date,
    employeeIds?: string[]
  ): Promise<string[]> {
    const entries = await prisma.timeEntry.findMany({
      where: {
        clockIn: { gte: periodStart, lte: periodEnd },
        status: { in: ['APPROVED', 'SUBMITTED'] },
        deletedAt: null,
        ...(employeeIds ? { employeeId: { in: employeeIds } } : {}),
      },
      select: { id: true },
    });
    return entries.map((e) => e.id);
  }
}

export const payrollService = new PayrollService();
