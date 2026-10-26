import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { apiRouter } from './src/server/routes.ts';
import { db } from './src/server/db.ts';
import {
  generateAriaResponse,
  synthesizeAriaVoice,
  generateCallSummary,
  transcribeAudio,
} from './src/server/ai.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Mount API routes
  app.use('/api', apiRouter);

  // WebSocket Server for Real-Time Voice and Messaging
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname.startsWith('/ws/calls/')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const callId = url.pathname.replace('/ws/calls/', '').trim();
    let currentCallId = callId;

    if (!currentCallId || currentCallId === 'new') {
      const newCall = db.createCall(
        "Hello! I'm Aria, your Aura Skincare support assistant. How can I help you today?"
      );
      currentCallId = newCall.id;
    }

    // Send session ready message
    ws.send(
      JSON.stringify({
        type: 'session_ready',
        callId: currentCallId,
        message: "Hello! I'm Aria, your Aura Skincare support assistant. How can I help you today?",
      })
    );

    ws.on('message', async (data: Buffer | string) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (payload.type === 'customer_speech') {
          const { text, audioBase64 } = payload;
          let customerText = (text || '').trim();

          ws.send(JSON.stringify({ type: 'state_change', state: 'thinking' }));

          if (!customerText && audioBase64) {
            customerText = await transcribeAudio(audioBase64);
          }

          if (!customerText) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Could not detect speech. Please speak again.',
              })
            );
            ws.send(JSON.stringify({ type: 'state_change', state: 'listening' }));
            return;
          }

          // Record customer speech
          db.appendTranscript(currentCallId, 'customer', customerText);

          // Get call history
          const call = db.getCall(currentCallId);
          const history = (call?.transcript || []).map((t) => ({
            role: t.speaker === 'customer' ? ('user' as const) : ('assistant' as const),
            text: t.text,
          }));

          // Generate response with tools
          const aiResult = await generateAriaResponse({
            userMessage: customerText,
            conversationHistory: history.slice(0, -1),
          });

          // Record tools
          if (aiResult.toolInvocations?.length) {
            for (const inv of aiResult.toolInvocations) {
              db.recordToolExecution(currentCallId, inv.toolName, inv.arguments, inv.result);
            }
          }

          // Record assistant speech
          db.appendTranscript(currentCallId, 'assistant', aiResult.text, aiResult.toolInvocations);

          // Synthesize audio
          ws.send(JSON.stringify({ type: 'state_change', state: 'speaking' }));
          const tts = await synthesizeAriaVoice(aiResult.text);

          ws.send(
            JSON.stringify({
              type: 'assistant_response',
              customerText,
              assistantText: aiResult.text,
              audioBase64: tts.audioBase64 || null,
              audioMimeType: tts.mimeType,
              toolInvocations: aiResult.toolInvocations,
            })
          );

          ws.send(JSON.stringify({ type: 'state_change', state: 'listening' }));
        }

        if (payload.type === 'end_call') {
          const call = db.getCall(currentCallId);
          if (call) {
            const summary = await generateCallSummary(
              call.transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
              call.associatedOrderId
            );
            const ended = db.endCall(currentCallId, summary, summary.order_id || undefined);
            ws.send(
              JSON.stringify({
                type: 'call_ended',
                call: ended,
                summary,
              })
            );
          }
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        ws.send(JSON.stringify({ type: 'error', message: errorMsg }));
      }
    });

    ws.on('close', () => {
      // client disconnected
    });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Aura Skincare Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Fatal]', err);
  process.exit(1);
});
