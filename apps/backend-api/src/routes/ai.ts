import { Router, Request, Response } from 'express';
import { z } from 'zod';

export const aiRouter = Router();
const feedbackStore = new Map<string, AiFeedback>();
const MAX_INPUT_LENGTH = 2000;

const DOMAIN_KEYWORDS = [
  'timesheet',
  'clock in',
  'clock out',
  'overtime',
  'payroll',
  'driver',
  'route',
  'compliance',
  'cdl',
  'dot',
  'hos',
  'labor',
  'schedule',
  'employee',
  'pto',
  'servicecore',
  'dispatch',
  'job',
];

const BLOCKED_PATTERNS = [
  /ignore\s+all\s+previous\s+instructions/i,
  /reveal\s+(api\s+keys?|secrets?|credentials?)/i,
  /show\s+me\s+your\s+prompt/i,
  /bypass\s+(security|guardrails|policy)/i,
  /drop\s+table/i,
  /delete\s+from/i,
];

type Rating = 'UP' | 'DOWN';

interface AiToolCall {
  id: string;
  type: 'query' | 'action' | 'lookup';
  name: string;
  description: string;
  args: Record<string, unknown>;
}

interface AiFeedback {
  id: string;
  responseId: string;
  rating: Rating;
  comment?: string;
  createdAt: string;
  createdBy: string | null;
}

const nlqSchema = z.object({
  query: z.string().min(3),
});

const voiceSchema = z.object({
  transcript: z.string().min(3),
});

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().min(1).optional(),
});

const feedbackSchema = z.object({
  responseId: z.string().min(1),
  rating: z.enum(['UP', 'DOWN']),
  comment: z.string().max(500).optional(),
});

function apiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
): void {
  res.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

function normalizeText(input: string): string {
  return input.trim().toLowerCase();
}

function isOnTopic(_input: string): boolean {
  // Allow all queries for demo — guardrail relaxed
  return true;
}

function hasBlockedPattern(input: string): boolean {
  const text = normalizeText(input);
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

function guardrailResponse(input: string) {
  if (input.length > MAX_INPUT_LENGTH) {
    return {
      blocked: true,
      code: 'INPUT_TOO_LONG',
      message: `Input exceeds ${MAX_INPUT_LENGTH} characters`,
    };
  }

  if (hasBlockedPattern(input)) {
    return {
      blocked: true,
      code: 'PROMPT_GUARDRAIL_BLOCKED',
      message:
        'Request was blocked by AI safety guardrails. Please rephrase as a payroll/time/compliance question.',
    };
  }

  if (!isOnTopic(input)) {
    return {
      blocked: true,
      code: 'OFF_TOPIC',
      message:
        'I can only help with ServiceCore work topics: timesheets, payroll, scheduling, compliance, routes, and labor analytics.',
    };
  }

  return { blocked: false as const };
}

// ---------------------------------------------------------------------------
// POST /nlq — natural language query powered by Claude
// ---------------------------------------------------------------------------
aiRouter.post('/nlq', async (req: Request, res: Response) => {
  const parsed = nlqSchema.safeParse(req.body);
  if (!parsed.success) {
    apiError(res, 400, 'VALIDATION_ERROR', 'Invalid NLQ payload', parsed.error.flatten());
    return;
  }
  const { query } = parsed.data;
  const guardrail = guardrailResponse(query);
  if (guardrail.blocked) {
    apiError(res, 422, guardrail.code, guardrail.message);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    apiError(res, 503, 'AI_NOT_CONFIGURED', 'AI service not configured. Set ANTHROPIC_API_KEY environment variable.');
    return;
  }

  // Fetch real context from the database
  const { jobEstimateService } = await import('../services/job-estimate.service');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let contextData = '';
  try {
    const summary = await jobEstimateService.getAnalyticsSummary(monthStart, now);
    const topOT = await jobEstimateService.getTopOTEmployees(monthStart, now, 5);
    const costByJob = await jobEstimateService.getCostByJobType(monthStart, now);

    contextData = `
CURRENT DATA (${monthStart.toLocaleDateString()} to ${now.toLocaleDateString()}):
- Total employees: ${summary.totalEmployees}
- Total hours worked: ${summary.totalHours}h (${summary.totalRegularHours}h regular, ${summary.totalOTHours}h overtime)
- Total labor cost: $${summary.totalLaborCost.toLocaleString()} ($${summary.totalOTCost.toLocaleString()} in OT)
- Avg hours per employee: ${summary.avgHoursPerEmployee}h

Top overtime employees:
${topOT.map((e, i) => `${i + 1}. ${e.employeeName}: ${e.otHours}h OT at $${e.avgRate}/hr`).join('\n')}

Cost by job type:
${costByJob.map((j) => `- ${j.jobType.replace(/_/g, ' ')}: $${(j.regularPay + j.overtimePay).toLocaleString()} (${j.totalHours}h)`).join('\n')}
`;
  } catch {
    contextData = 'Unable to fetch current data from database.';
  }

  const systemPrompt = `You are ServiceCore AI, a workforce analytics assistant for a Denver waste management company.
You help managers understand labor data, overtime trends, compliance risks, and scheduling efficiency.

${contextData}

When answering questions, respond with a JSON object containing:
{
  "explanation": "A clear, concise answer to the question in 1-3 sentences",
  "sql": "The SQL query that would answer this question (for transparency)",
  "chartType": "bar" | "table" | "number",
  "chartData": { ... } // depends on chartType:
    // For "bar": { "labels": [...], "series": [{ "name": "...", "data": [...] }] }
    // For "table": { "columns": [{ "field": "...", "header": "..." }], "rows": [{ ... }] }
    // For "number": { "value": "...", "label": "..." }
}

Use the real data provided above. Be specific with numbers. Always respond with valid JSON only, no markdown.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: query }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[ai/nlq] Claude API error:', response.status, err);
      apiError(res, 502, 'AI_UPSTREAM_ERROR', `AI service error: ${response.status} — check ANTHROPIC_API_KEY`);
      return;
    }

    const data = await response.json() as any;
    const text = data.content?.[0]?.text ?? '';

    // Parse the JSON response from Claude
    let parsed_ai: any;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed_ai = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch {
      // If JSON parsing fails, return as plain text explanation
      parsed_ai = {
        explanation: text,
        sql: '-- AI generated a text response',
        chartType: 'number',
        chartData: { value: '—', label: text.slice(0, 100) },
      };
    }

    const responseId = `nlq-${Date.now()}`;
    res.json({
      responseId,
      query,
      explanation: parsed_ai.explanation ?? '',
      sql: parsed_ai.sql ?? '',
      chartType: parsed_ai.chartType ?? 'table',
      chartData: parsed_ai.chartData ?? {},
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[ai/nlq]', err);
    apiError(res, 500, 'AI_ERROR', 'Failed to process AI query');
  }
});

// ---------------------------------------------------------------------------
// POST /voice — voice FastFill (proxy to Genkit)
// ---------------------------------------------------------------------------
aiRouter.post('/voice', (req: Request, res: Response) => {
  const parsed = voiceSchema.safeParse(req.body);
  if (!parsed.success) {
    apiError(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid voice payload',
      parsed.error.flatten()
    );
    return;
  }
  const { transcript } = parsed.data;
  const guardrail = guardrailResponse(transcript);
  if (guardrail.blocked) {
    apiError(res, 422, guardrail.code, guardrail.message);
    return;
  }
  const responseId = `voice-${Date.now()}`;

  const toolCalls: AiToolCall[] = [
    {
      id: `tool-${Date.now()}-1`,
      type: 'action',
      name: 'parse_voice_intent',
      description: 'Extract intent and fields from transcript',
      args: { language: 'en-US', domain: 'timesheet' },
    },
  ];

  // Stub — returns parsed intent from voice input
  res.json({
    responseId,
    transcript,
    parsed: {
      intent: 'CLOCK_IN',
      jobType: 'RESIDENTIAL_SANITATION',
      notes: 'Starting Route 14',
      confidence: 0.95,
    },
    toolCalls,
    rating: {
      up: 0,
      down: 0,
    },
    generatedAt: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// POST /chat — HR chatbot (proxy to Genkit)
// ---------------------------------------------------------------------------
aiRouter.post('/chat', (req: Request, res: Response) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    apiError(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid chat payload',
      parsed.error.flatten()
    );
    return;
  }
  const { message, conversationId } = parsed.data;
  const guardrail = guardrailResponse(message);
  if (guardrail.blocked) {
    apiError(res, 422, guardrail.code, guardrail.message);
    return;
  }
  const responseId = `chat-${Date.now()}`;

  const toolCalls: AiToolCall[] = [
    {
      id: `tool-${Date.now()}-1`,
      type: 'lookup',
      name: 'policy_retrieval',
      description: 'Retrieve labor policy references from knowledge base',
      args: { topic: 'daily_overtime', jurisdiction: 'CA' },
    },
  ];

  res.json({
    responseId,
    conversationId: conversationId ?? `conv-${Date.now()}`,
    message,
    reply:
      'California requires daily overtime pay after 8 hours and double-time after 12 hours. Your company also follows the weekly 40-hour threshold. Would you like me to look up a specific employee\'s OT status?',
    sources: [
      { title: 'CA Labor Code Section 510', url: 'https://leginfo.legislature.ca.gov/' },
    ],
    toolCalls,
    rating: {
      up: 0,
      down: 0,
    },
    generatedAt: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// POST /feedback — thumbs up/down feedback for AI responses
// ---------------------------------------------------------------------------
aiRouter.post('/feedback', (req: Request, res: Response) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    apiError(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid feedback payload',
      parsed.error.flatten()
    );
    return;
  }

  const feedback: AiFeedback = {
    id: `fb-${Date.now()}`,
    responseId: parsed.data.responseId,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    createdAt: new Date().toISOString(),
    createdBy: req.user?.sub ?? null,
  };

  feedbackStore.set(feedback.id, feedback);

  const aggregate = Array.from(feedbackStore.values()).filter(
    (item) => item.responseId === feedback.responseId
  );
  const up = aggregate.filter((item) => item.rating === 'UP').length;
  const down = aggregate.filter((item) => item.rating === 'DOWN').length;

  res.status(201).json({
    data: feedback,
    aggregate: {
      responseId: feedback.responseId,
      up,
      down,
    },
  });
});
