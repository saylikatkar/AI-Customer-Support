import { Router, Request, Response } from 'express';
import { db } from './db.ts';
import { BRAND_POLICIES } from './policies.ts';
import { executeTool } from './tools.ts';
import {
  generateAriaResponse,
  synthesizeAriaVoice,
  transcribeAudio,
  generateCallSummary,
} from './ai.ts';

export const apiRouter = Router();

// 1. Health check
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Aura Skincare AI Voice Support API',
    assistant: 'Aria',
    timestamp: new Date().toISOString(),
    ai_configured: Boolean(process.env.GEMINI_API_KEY),
    uptime_seconds: process.uptime(),
  });
});

// 2. Orders endpoints
apiRouter.get('/orders', (_req: Request, res: Response) => {
  res.json({
    orders: db.listOrders(),
    count: db.listOrders().length,
  });
});

apiRouter.get('/orders/:order_id', (req: Request, res: Response) => {
  const orderId = req.params.order_id;
  const order = db.getOrder(orderId);
  if (!order) {
    res.status(404).json({ error: `Order ${orderId} not found.` });
    return;
  }
  res.json({ order });
});

apiRouter.post('/orders/:order_id/cancel', (req: Request, res: Response) => {
  const orderId = req.params.order_id;
  const { reason } = req.body || {};
  const result = executeTool('cancel_order', { order_id: orderId, reason });
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(result.data);
});

apiRouter.post('/orders/reset', (_req: Request, res: Response) => {
  db.seed();
  res.json({ message: 'Sample orders have been reseeded to initial state.', orders: db.listOrders() });
});

// 3. Brand policies
apiRouter.get('/policies', (_req: Request, res: Response) => {
  res.json({ policies: BRAND_POLICIES });
});

// 4. Calls endpoints
apiRouter.post('/calls', (req: Request, res: Response) => {
  const greeting =
    req.body?.greeting ||
    "Hello! I'm Aria, your Aura Skincare support assistant. How can I help you today?";
  const call = db.createCall(greeting);
  res.status(201).json({ call, initialGreeting: greeting });
});

apiRouter.get('/calls', (_req: Request, res: Response) => {
  res.json({ calls: db.listCalls() });
});

apiRouter.get('/calls/:call_id', (req: Request, res: Response) => {
  const call = db.getCall(req.params.call_id);
  if (!call) {
    res.status(404).json({ error: `Call ${req.params.call_id} not found.` });
    return;
  }
  res.json({ call });
});

apiRouter.get('/calls/:call_id/transcript', (req: Request, res: Response) => {
  const call = db.getCall(req.params.call_id);
  if (!call) {
    res.status(404).json({ error: `Call ${req.params.call_id} not found.` });
    return;
  }
  res.json({ transcript: call.transcript });
});

apiRouter.get('/calls/:call_id/summary', (req: Request, res: Response) => {
  const call = db.getCall(req.params.call_id);
  if (!call) {
    res.status(404).json({ error: `Call ${req.params.call_id} not found.` });
    return;
  }
  res.json({ summary: call.summary || null });
});

apiRouter.post('/calls/:call_id/end', async (req: Request, res: Response) => {
  const call = db.getCall(req.params.call_id);
  if (!call) {
    res.status(404).json({ error: `Call ${req.params.call_id} not found.` });
    return;
  }

  // Idempotent finalization
  if (call.status === 'completed' && call.summary) {
    res.json({ call, summary: call.summary });
    return;
  }

  // Generate summary
  const summary = await generateCallSummary(
    call.transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
    call.associatedOrderId
  );

  const endedCall = db.endCall(call.id, summary, summary.order_id || undefined);
  res.json({ call: endedCall, summary });
});

// 5. Real-time call interaction (Voice or text turn)
apiRouter.post('/calls/:call_id/interact', async (req: Request, res: Response) => {
  const callId = req.params.call_id;
  const call = db.getCall(callId);
  if (!call) {
    res.status(404).json({ error: `Call ${callId} not found.` });
    return;
  }

  const { text, audioBase64, audioMimeType } = req.body || {};
  let customerText = (text || '').trim();

  // If customer sent audio, transcribe it first
  if (!customerText && audioBase64) {
    customerText = await transcribeAudio(audioBase64, audioMimeType || 'audio/webm');
  }

  if (!customerText) {
    res.status(400).json({ error: 'No speech or text provided in request.' });
    return;
  }

  // Append customer utterance to transcript
  db.appendTranscript(callId, 'customer', customerText);

  // Prepare multi-turn history
  const history = call.transcript.map((t) => ({
    role: t.speaker === 'customer' ? ('user' as const) : ('assistant' as const),
    text: t.text,
  }));

  // Generate Aria's response with tools
  const aiResult = await generateAriaResponse({
    userMessage: customerText,
    conversationHistory: history.slice(0, -1), // exclude just appended user message as it is userMessage
  });

  // Record tool executions
  if (aiResult.toolInvocations && aiResult.toolInvocations.length > 0) {
    for (const inv of aiResult.toolInvocations) {
      db.recordToolExecution(callId, inv.toolName, inv.arguments, inv.result);
    }
  }

  // Append Aria's utterance to transcript
  db.appendTranscript(callId, 'assistant', aiResult.text, aiResult.toolInvocations);

  // Synthesize speech
  const ttsResult = await synthesizeAriaVoice(aiResult.text);

  res.json({
    callId,
    customerText,
    assistantText: aiResult.text,
    audioBase64: ttsResult.audioBase64 || null,
    audioMimeType: ttsResult.mimeType,
    toolInvocations: aiResult.toolInvocations,
  });
});

// 6. Text development fallback endpoint
apiRouter.post('/chat/message', async (req: Request, res: Response) => {
  const { message, conversationHistory } = req.body || {};
  const userText = (message || '').trim();
  if (!userText) {
    res.status(400).json({ error: 'Message cannot be empty.' });
    return;
  }

  const aiResult = await generateAriaResponse({
    userMessage: userText,
    conversationHistory: conversationHistory || [],
  });

  res.json({
    reply: aiResult.text,
    toolInvocations: aiResult.toolInvocations,
  });
});

// 7. Direct TTS endpoint
apiRouter.post('/voice/synthesize', async (req: Request, res: Response) => {
  const { text } = req.body || {};
  if (!text) {
    res.status(400).json({ error: 'Text required for synthesis.' });
    return;
  }

  const result = await synthesizeAriaVoice(text);
  res.json(result);
});

// 8. Direct transcribe endpoint
apiRouter.post('/voice/transcribe', async (req: Request, res: Response) => {
  const { audioBase64, mimeType } = req.body || {};
  if (!audioBase64) {
    res.status(400).json({ error: 'audioBase64 is required.' });
    return;
  }

  const text = await transcribeAudio(audioBase64, mimeType || 'audio/webm');
  res.json({ text });
});
