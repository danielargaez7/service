import { PayrollFormatter, PayrollExportRow } from './index';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Gusto bulk payroll import format
 * Matches Gusto's CSV template for importing hours
 */
export class GustoFormatter implements PayrollFormatter {
  format = 'GUSTO';
  contentType = 'text/csv';
  fileExtension = '.csv';

  generate(rows: PayrollExportRow[]): string {
    const headers = [
      'employee_id',
      'first_name',
      'last_name',
      'email',
      'period_start',
      'period_end',
      'regular_hours',
      'overtime_hours',
      'double_time_hours',
      'hourly_rate',
      'bonus',
      'reimbursement',
      'memo',
    ];

    const lines = rows.map((row) => [
      escapeCsv(row.employeeId),
      escapeCsv(row.firstName),
      escapeCsv(row.lastName),
      escapeCsv(row.email),
      escapeCsv(row.periodStart),
      escapeCsv(row.periodEnd),
      row.regularHours.toFixed(2),
      row.overtimeHours.toFixed(2),
      row.doubleTimeHours.toFixed(2),
      row.hourlyRate.toFixed(2),
      '0.00', // bonus
      '0.00', // reimbursement
      escapeCsv(`ServiceCore auto-generated ${row.periodStart} to ${row.periodEnd}`),
    ].join(','));

    return [headers.join(','), ...lines].join('\n');
  }
}
