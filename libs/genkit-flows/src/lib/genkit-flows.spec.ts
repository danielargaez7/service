import { createGenkitFlowRegistry } from './genkit-flows';

describe('createGenkitFlowRegistry', () => {
  it('should expose all required flow handlers', () => {
    const registry = createGenkitFlowRegistry();
    expect(typeof registry.nlq).toBe('function');
    expect(typeof registry.voiceFastfill).toBe('function');
    expect(typeof registry.hrChatbot).toBe('function');
    expect(typeof registry.payrollSummary).toBe('function');
  });

  it('should execute NLQ flow contract', async () => {
    const registry = createGenkitFlowRegistry();
    const output = await registry.nlq({
      question: 'Who has the most overtime this week?',
      userId: 'emp-mgr',
      userRole: 'ROUTE_MANAGER',
    });
    expect(output).toHaveProperty('sql');
    expect(output).toHaveProperty('chartType');
  });

  it('should execute HR chatbot flow contract', async () => {
    const registry = createGenkitFlowRegistry();
    const output = await registry.hrChatbot({
      question: 'Can you change pay for employee 123?',
      userId: 'emp-hr',
      conversationHistory: [],
    });
    expect(output).toMatchObject({ escalate: true });
  });
});
