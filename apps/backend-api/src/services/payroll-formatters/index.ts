import { ADPFormatter } from './adp.formatter';
import { GustoFormatter } from './gusto.formatter';
import { QuickBooksFormatter } from './quickbooks.formatter';

export interface PayrollExportRow {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  regularPay: number;
  overtimePay: number;
  doubleTimePay: number;
  totalPay: number;
  hourlyRate: number;
  department: string;
  jobTitle: string;
  stateCode: string;
}

export interface PayrollFormatter {
  format: string;
  contentType: string;
  fileExtension: string;
  generate(rows: PayrollExportRow[]): string;
}

const formatters: Record<string, PayrollFormatter> = {
  ADP: new ADPFormatter(),
  GUSTO: new GustoFormatter(),
  QUICKBOOKS: new QuickBooksFormatter(),
};

export function getFormatter(format: string): PayrollFormatter | null {
  return formatters[format.toUpperCase()] ?? null;
}

export function getSupportedFormats(): string[] {
  return Object.keys(formatters);
}
