import { z } from 'zod';

export const nlqInputSchema = z.object({
  question: z.string().min(3),
  userId: z.string().min(1),
  userRole: z.enum(['HR_ADMIN', 'EXECUTIVE', 'ROUTE_MANAGER']),
});

export const nlqOutputSchema = z.object({
  sql: z.string(),
  explanation: z.string(),
  chartType: z.enum(['bar', 'line', 'pie', 'table', 'number']),
  data: z.array(z.record(z.string(), z.unknown())),
});

export type NlqInput = z.infer<typeof nlqInputSchema>;
export type NlqOutput = z.infer<typeof nlqOutputSchema>;

/**
 * PRD-aligned NLQ flow contract.
 * This implementation is intentionally deterministic until production Genkit wiring is enabled.
 */
export async function runNlqFlow(input: NlqInput): Promise<NlqOutput> {
  const parsed = nlqInputSchema.parse(input);
  const sanitizedQuestion = parsed.question.replace(/'/g, "''");

  return nlqOutputSchema.parse({
    sql: `SELECT employee_id, SUM(overtime_hours) AS overtime_hours FROM payroll_summary WHERE period = 'current_week' GROUP BY employee_id ORDER BY overtime_hours DESC LIMIT 10 -- ${sanitizedQuestion}`,
    explanation:
      'This result highlights the employees contributing the highest overtime in the current period. Use it to identify where schedule balancing can reduce labor cost.',
    chartType: 'bar',
    data: [],
  });
}
