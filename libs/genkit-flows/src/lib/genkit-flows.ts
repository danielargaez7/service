import { runHrChatbotFlow, type HrChatbotInput } from '../flows/hr-chatbot.flow';
import { runNlqFlow, type NlqInput } from '../flows/nlq.flow';
import {
  runPayrollSummaryFlow,
  type PayrollSummaryInput,
} from '../flows/payroll-summary.flow';
import {
  runVoiceFastfillFlow,
  type VoiceFastfillInput,
} from '../flows/voice-fastfill.flow';

export interface GenkitFlowRegistry {
  nlq: (input: NlqInput) => Promise<unknown>;
  voiceFastfill: (input: VoiceFastfillInput) => Promise<unknown>;
  hrChatbot: (input: HrChatbotInput) => Promise<unknown>;
  payrollSummary: (input: PayrollSummaryInput) => Promise<unknown>;
}

export function createGenkitFlowRegistry(): GenkitFlowRegistry {
  return {
    nlq: runNlqFlow,
    voiceFastfill: runVoiceFastfillFlow,
    hrChatbot: runHrChatbotFlow,
    payrollSummary: runPayrollSummaryFlow,
  };
}
