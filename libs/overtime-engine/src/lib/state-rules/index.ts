import { StateOvertimeRule } from '../types';
import { californiaRule } from './california';
import { coloradoRule } from './colorado';

const STATE_RULES: Map<string, StateOvertimeRule> = new Map([
  ['CA', californiaRule],
  ['CO', coloradoRule],
  // Add more states as needed. States not listed here follow FLSA federal rules only.
]);

export function getStateRule(stateCode: string): StateOvertimeRule | null {
  return STATE_RULES.get(stateCode.toUpperCase()) ?? null;
}

export function getSupportedStates(): string[] {
  return Array.from(STATE_RULES.keys());
}
