import { z } from 'zod';

export const voiceFastfillInputSchema = z.object({
  audioBase64: z.string().min(1),
  employeeId: z.string().min(1),
  jobType: z.string().min(1),
});

export const voiceFastfillOutputSchema = z.object({
  wasteVolume: z.number().optional(),
  tankCondition: z.string().optional(),
  followUpRequired: z.boolean().optional(),
  followUpType: z.string().optional(),
  notes: z.string().optional(),
  estimatedDuration: z.number().optional(),
});

export type VoiceFastfillInput = z.infer<typeof voiceFastfillInputSchema>;
export type VoiceFastfillOutput = z.infer<typeof voiceFastfillOutputSchema>;

/**
 * PRD-aligned Voice FastFill flow contract.
 * Returns a deterministic parse scaffold while upstream Gemini audio wiring is pending.
 */
export async function runVoiceFastfillFlow(
  input: VoiceFastfillInput
): Promise<VoiceFastfillOutput> {
  const parsed = voiceFastfillInputSchema.parse(input);

  return voiceFastfillOutputSchema.parse({
    followUpRequired: false,
    notes: `Voice summary captured for ${parsed.employeeId} (${parsed.jobType})`,
    estimatedDuration: 60,
  });
}
