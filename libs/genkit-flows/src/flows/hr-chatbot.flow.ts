import { z } from 'zod';

export const hrChatbotInputSchema = z.object({
  question: z.string().min(1),
  userId: z.string().min(1),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      })
    )
    .default([]),
});

export const hrChatbotOutputSchema = z.object({
  answer: z.string(),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  escalate: z.boolean(),
});

export type HrChatbotInput = z.infer<typeof hrChatbotInputSchema>;
export type HrChatbotOutput = z.infer<typeof hrChatbotOutputSchema>;

/**
 * PRD-aligned HR chatbot flow contract.
 * Escalates requests that mention direct pay/schedule/certification actions.
 */
export async function runHrChatbotFlow(
  input: HrChatbotInput
): Promise<HrChatbotOutput> {
  const parsed = hrChatbotInputSchema.parse(input);
  const text = parsed.question.toLowerCase();
  const escalate = /(change|edit|update).*(pay|schedule|certification)/i.test(text);

  return hrChatbotOutputSchema.parse({
    answer: escalate
      ? 'This request requires HR review before any action can be taken. I have flagged it for human approval.'
      : 'I can help explain policy and compliance context. Ask for overtime, HOS, PTO, or payroll guidance.',
    confidence: escalate ? 'MEDIUM' : 'HIGH',
    escalate,
  });
}
