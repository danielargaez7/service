import { PayrollFormatter, PayrollExportRow } from './index';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * QuickBooks Payroll / Timer import format
 * Matches QuickBooks Desktop and Online payroll CSV import
 */
export class QuickBooksFormatter implements PayrollFormatter {
  format = 'QUICKBOOKS';
  contentType = 'text/csv';
  fileExtension = '.csv';

  generate(rows: PayrollExportRow[]): string {
    const headers = [
      'Employee',
      'Pay Period Start',
      'Pay Period End',
      'Payroll Item',
      'Hours',
      'Rate',
      'Amount',
      'Service Item',
      'Notes',
    ];

    const lines: string[] = [];

    for (const row of rows) {
      const empName = escapeCsv(`${row.lastName}, ${row.firstName}`);

      // Regular hours line
      if (row.regularHours > 0) {
        lines.push([
          empName,
          escapeCsv(row.periodStart),
          escapeCsv(row.periodEnd),
          'Regular Pay',
          row.regularHours.toFixed(2),
          row.hourlyRate.toFixed(2),
          row.regularPay.toFixed(2),
          escapeCsv(row.department),
          escapeCsv('ServiceCore auto-generated'),
        ].join(','));
      }

      // Overtime hours line
      if (row.overtimeHours > 0) {
        lines.push([
          empName,
          escapeCsv(row.periodStart),
          escapeCsv(row.periodEnd),
          'Overtime Pay',
          row.overtimeHours.toFixed(2),
          (row.hourlyRate * 1.5).toFixed(2),
          row.overtimePay.toFixed(2),
          escapeCsv(row.department),
          escapeCsv('ServiceCore auto-generated'),
        ].join(','));
      }

      // Double-time hours line
      if (row.doubleTimeHours > 0) {
        lines.push([
          empName,
          escapeCsv(row.periodStart),
          escapeCsv(row.periodEnd),
          'Double Time Pay',
          row.doubleTimeHours.toFixed(2),
          (row.hourlyRate * 2).toFixed(2),
          row.doubleTimePay.toFixed(2),
          escapeCsv(row.department),
          escapeCsv('ServiceCore auto-generated'),
        ].join(','));
      }
    }

    return [headers.join(','), ...lines].join('\n');
  }
}
