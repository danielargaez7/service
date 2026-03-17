import { Router, Request, Response } from 'express';

export const aiRouter = Router();

// ---------------------------------------------------------------------------
// POST /nlq — natural language query (proxy to Genkit)
// ---------------------------------------------------------------------------
aiRouter.post('/nlq', (req: Request, res: Response) => {
  const { query } = req.body as { query?: string };

  if (!query) {
    res.status(400).json({ error: 'query is required' });
    return;
  }

  // Stub response — in production this proxies to the Genkit NLQ flow
  res.json({
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
    generatedAt: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// POST /voice — voice FastFill (proxy to Genkit)
// ---------------------------------------------------------------------------
aiRouter.post('/voice', (req: Request, res: Response) => {
  const { transcript } = req.body as { transcript?: string };

  if (!transcript) {
    res.status(400).json({ error: 'transcript is required' });
    return;
  }

  // Stub — returns parsed intent from voice input
  res.json({
    transcript,
    parsed: {
      intent: 'CLOCK_IN',
      jobType: 'RESIDENTIAL_SANITATION',
      notes: 'Starting Route 14',
      confidence: 0.95,
    },
    generatedAt: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// POST /chat — HR chatbot (proxy to Genkit)
// ---------------------------------------------------------------------------
aiRouter.post('/chat', (req: Request, res: Response) => {
  const { message, conversationId } = req.body as {
    message?: string;
    conversationId?: string;
  };

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  res.json({
    conversationId: conversationId ?? `conv-${Date.now()}`,
    reply:
      'California requires daily overtime pay after 8 hours and double-time after 12 hours. Your company also follows the weekly 40-hour threshold. Would you like me to look up a specific employee\'s OT status?',
    sources: [
      { title: 'CA Labor Code Section 510', url: 'https://leginfo.legislature.ca.gov/' },
    ],
    generatedAt: new Date().toISOString(),
  });
});
