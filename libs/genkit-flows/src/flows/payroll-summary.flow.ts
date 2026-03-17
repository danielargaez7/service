import { z } from 'zod';

export const payrollSummaryInputSchema = z.object({
  payPeriodId: z.string().min(1),
  managerId: z.string().min(1),
});

export const payrollSummaryOutputSchema = z.object({
  summary: z.string(),
});

export type PayrollSummaryInput = z.infer<typeof payrollSummaryInputSchema>;
export type PayrollSummaryOutput = z.infer<typeof payrollSummaryOutputSchema>;

/**
 * PRD-aligned payroll digest flow contract.
 */
export async function runPayrollSummaryFlow(
  input: PayrollSummaryInput
): Promise<PayrollSummaryOutput> {
  const parsed = payrollSummaryInputSchema.parse(input);

  return payrollSummaryOutputSchema.parse({
    summary: `Pay period ${parsed.payPeriodId}: labor summary generated for manager ${parsed.managerId}. Overtime and discrepancy details are ready for HR review.`,
  });
}
