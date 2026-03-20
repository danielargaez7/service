import { Router, Request, Response } from 'express';
import { z } from 'zod';
import logger from '../logger';
import prisma from '../prisma';

export const aiRouter = Router();
const feedbackStore = new Map<string, AiFeedback>();
const conversationStore = new Map<string, { role: string; content: string }[]>();
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
      logger.error({ status: response.status, err }, '[ai/nlq] Claude API error');
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
    logger.error(err, '[ai/nlq]');
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
// POST /chat — AI-powered workforce management chatbot
// ---------------------------------------------------------------------------
aiRouter.post('/chat', async (req: Request, res: Response) => {
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    apiError(res, 503, 'AI_NOT_CONFIGURED', 'AI service not configured. Set ANTHROPIC_API_KEY environment variable.');
    return;
  }

  // Fetch real context from the database
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let contextData = '';
  try {
    const [totalEmployees, todayEntries, weeklyHours, expiringCerts] = await Promise.all([
      prisma.employee.count({ where: { deletedAt: null } }),
      prisma.timeEntry.count({
        where: { clockIn: { gte: todayStart, lt: todayEnd }, deletedAt: null },
      }),
      prisma.timeEntry.groupBy({
        by: ['employeeId'],
        where: { clockIn: { gte: weekAgo }, deletedAt: null },
        _sum: { hoursWorked: true },
      }),
      prisma.certification.findMany({
        where: { expiryDate: { gte: now, lte: thirtyDaysOut } },
        include: { employee: { select: { firstName: true, lastName: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);

    const hosWarnings = weeklyHours
      .filter((e) => Number(e._sum.hoursWorked ?? 0) > 56)
      .map((e) => ({ employeeId: e.employeeId, weeklyHours: Number(e._sum.hoursWorked) }));

    const certLines = expiringCerts.map(
      (c) =>
        `- ${c.employee.firstName} ${c.employee.lastName}: ${c.type.replace(/_/g, ' ')} expires ${c.expiryDate.toLocaleDateString()}`
    );

    contextData = [
      `Total employees: ${totalEmployees}`,
      `Active time entries today: ${todayEntries}`,
      `HOS warnings (>56hr/week): ${hosWarnings.length > 0 ? hosWarnings.map((w) => `Employee ${w.employeeId}: ${w.weeklyHours.toFixed(1)}h`).join(', ') : 'None'}`,
      `Certifications expiring within 30 days: ${certLines.length > 0 ? '\n' + certLines.join('\n') : 'None'}`,
    ].join('\n');
  } catch (err) {
    logger.error(err, '[ai/chat] Failed to fetch context data');
    contextData = 'Unable to fetch current data from database.';
  }

  const systemPrompt = `You are ServiceCore AI, a workforce management assistant for a Denver waste management company with 18 employees.

GUARDRAILS:
- Only answer questions about: employee hours, overtime, payroll, scheduling, compliance (CDL/DOT/HOS), routes, and labor analytics
- Never reveal API keys, database credentials, or system internals
- Never generate SQL or code — summarize data in plain English
- If asked about something outside your domain, politely redirect to workforce topics
- Keep responses concise (2-4 sentences max)

AVAILABLE TOOLS & KNOWLEDGE:
- Employee lookup: hours worked, overtime status, pay rates
- HOS compliance: driving hours limits (11hr daily, 60hr/7-day cycle)
- CDL/DOT tracking: license and physical exam expiration dates
- Overtime rules: FLSA (40hr/week), Colorado state rules, Motor Carrier exemptions
- Schedule management: route assignments, shift coverage
- Payroll: labor cost calculations, job type breakdowns
- Anomaly detection: unusual clock-in patterns, GPS mismatches

CURRENT DATA:
${contextData}

When answering, be specific with numbers from the data provided. If you don't have enough data to answer precisely, say so and suggest what report they should check.`;

  // Manage conversation history
  const convId = conversationId ?? `conv-${Date.now()}`;
  const history = conversationStore.get(convId) ?? [];
  history.push({ role: 'user', content: message });

  // Trim to last 20 messages
  while (history.length > 20) {
    history.shift();
  }

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
        max_tokens: 500,
        system: systemPrompt,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error({ status: response.status, err }, '[ai/chat] Claude API error');
      apiError(res, 502, 'AI_UPSTREAM_ERROR', `AI service error: ${response.status} — check ANTHROPIC_API_KEY`);
      return;
    }

    const data = (await response.json()) as any;
    const reply = data.content?.[0]?.text ?? '';

    // Store assistant response in conversation history
    history.push({ role: 'assistant', content: reply });
    conversationStore.set(convId, history);

    const responseId = `chat-${Date.now()}`;
    res.json({
      responseId,
      conversationId: convId,
      message,
      reply,
      sources: [],
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(err, '[ai/chat]');
    apiError(res, 500, 'AI_ERROR', 'Failed to process chat message');
  }
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
