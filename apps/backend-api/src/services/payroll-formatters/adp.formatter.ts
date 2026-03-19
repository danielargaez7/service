import { PayrollFormatter, PayrollExportRow } from './index';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * ADP eTime / Workforce Now import format
 * Standard batch import columns for ADP payroll processing
 */
export class ADPFormatter implements PayrollFormatter {
  format = 'ADP';
  contentType = 'text/csv';
  fileExtension = '.csv';

  generate(rows: PayrollExportRow[]): string {
    const headers = [
      'Co Code',
      'Batch ID',
      'File #',
      'Reg Hours',
      'O/T Hours',
      'Double Time Hours',
      'Reg Earnings',
      'O/T Earnings',
      'DT Earnings',
      'Total Earnings',
      'Pay Rate',
      'Department',
      'Job Title',
      'State Code',
    ];

    const lines = rows.map((row) => [
      escapeCsv('SC01'), // Company code
      escapeCsv(`BATCH-${row.periodEnd.replace(/-/g, '')}`),
      escapeCsv(row.employeeId),
      row.regularHours.toFixed(2),
      row.overtimeHours.toFixed(2),
      row.doubleTimeHours.toFixed(2),
      row.regularPay.toFixed(2),
      row.overtimePay.toFixed(2),
      row.doubleTimePay.toFixed(2),
      row.totalPay.toFixed(2),
      row.hourlyRate.toFixed(2),
      escapeCsv(row.department),
      escapeCsv(row.jobTitle),
      escapeCsv(row.stateCode),
    ].join(','));

    return [headers.join(','), ...lines].join('\n');
  }
}
