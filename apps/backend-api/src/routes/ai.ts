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

function isOnTopic(input: string): boolean {
  const text = normalizeText(input);
  return DOMAIN_KEYWORDS.some((keyword) => text.includes(keyword));
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
// POST /nlq — natural language query (proxy to Genkit)
// ---------------------------------------------------------------------------
aiRouter.post('/nlq', (req: Request, res: Response) => {
  const parsed = nlqSchema.safeParse(req.body);
  if (!parsed.success) {
    apiError(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid NLQ payload',
      parsed.error.flatten()
    );
    return;
  }
  const { query } = parsed.data;
  const guardrail = guardrailResponse(query);
  if (guardrail.blocked) {
    apiError(res, 422, guardrail.code, guardrail.message);
    return;
  }
  const responseId = `nlq-${Date.now()}`;

  const toolCalls: AiToolCall[] = [
    {
      id: `tool-${Date.now()}-1`,
      type: 'query',
      name: 'fetch_overtime_summary',
      description: 'Fetch overtime totals for active pay period',
      args: { period: 'current-week' },
    },
    {
      id: `tool-${Date.now()}-2`,
      type: 'lookup',
      name: 'fetch_high_risk_employees',
      description: 'Find employees over configured overtime threshold',
      args: { thresholdHours: 8 },
    },
  ];

  // Stub response — in production this proxies to the Genkit NLQ flow
  res.json({
    responseId,
    query,
    answer:
      'Based on this week\'s data, 3 employees have exceeded 8 hours of overtime. Carlos Rivera leads with 12.5 OT hours.',
    data: {
      topOvertimeEmployees: [
        { employeeId: 'emp-002', name: 'Carlos Rivera', otHours: 12.5 },
        { employeeId: 'emp-005', name: 'Mike Johnson', otHours: 9.0 },
        { employeeId: 'emp-008', name: 'Sarah Kim', otHours: 8.5 },
      ],
    },
    confidence: 0.92,
    toolCalls,
    rating: {
      up: 0,
      down: 0,
    },
    generatedAt: new Date().toISOString(),
  });
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
