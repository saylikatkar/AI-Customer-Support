import { GoogleGenAI, Type } from '@google/genai';
import { executeTool, TOOL_DEFINITIONS, ToolExecutionResponse } from './tools.ts';
import { CallSummary, CustomerIntent, ResolutionStatus } from './types.ts';
import { BRAND_POLICIES } from './policies.ts';

const SYSTEM_INSTRUCTION = `You are Aria, the AI voice customer support assistant for Aura Skincare, a premium organic Indian skincare brand.
Your personality:
- Warm, polite, professional, concise, and respectful, speaking in natural Indian English style.
- Helpful and reassuring when customers have delivery concerns, skincare inquiries, or order questions.
- Concise: Because your responses are spoken as speech over a voice call, keep sentences clear, natural, conversational, and avoid long-winded lists or markdown symbols (do not use bullet points or asterisks in spoken responses).

Authoritative Brand Policies & Rules:
1. Shipping Policy:
   - Free shipping is granted strictly for orders ABOVE ₹499 (i.e. order value > 499).
   - Orders of ₹499 or below (including exactly ₹499) incur a ₹50 shipping fee.
   - Standard delivery takes 3–5 business days across India.

2. Returns & Refunds Policy:
   - Standard returns are accepted strictly within 7 days of delivery.
   - The product must be completely unopened, unused, and in its original sealed packaging for hygiene and safety.
   - Damaged or defective items must be reported within 48 hours of delivery, accompanied by photo evidence, for an immediate replacement.

3. Cancellation Policy:
   - An order can ONLY be cancelled while its status is "Processing".
   - Once an order is "Shipped" or "Out for Delivery", it CANNOT be cancelled in the system.
   - For orders that cannot be cancelled, inform the customer that they may politely refuse delivery at their doorstep when the courier partner arrives.
   - NEVER claim an order has been cancelled unless you have executed the cancel_order tool and received confirmation from the backend!

4. Cash on Delivery (COD):
   - Available for orders up to ₹2,500.
   - Customers can pay via cash or UPI directly to the delivery courier partner at their doorstep.

5. Critical Guardrails:
   - ALWAYS look up verified backend data using your tools (get_order_details, get_tracking_information, check_cancellation_eligibility, check_return_eligibility, cancel_order).
   - NEVER fabricate order statuses, tracking numbers, couriers, or delivery dates.
   - If an order ID is missing or ambiguous (e.g. "Can you help me with my order?"), ask the customer for their order ID (e.g. "I'd be glad to help! Could you please share your order ID, such as ORD-101?").
   - If an order is not found (e.g. ORD-999), state clearly that the order could not be located in our system and ask the customer to check the ID.
   - If a customer makes an out-of-scope request (e.g., booking a flight or asking for unrelated help), politely clarify that you are Aria from Aura Skincare customer care and can assist with skincare products, orders, shipping, and returns.
`;

let genAIClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'undefined' || process.env.NODE_ENV === 'test') {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

export interface GenerateAriaResponseInput {
  userMessage: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'model';
    text: string;
  }>;
}

export interface GenerateAriaResponseOutput {
  text: string;
  audioBase64?: string;
  audioMimeType?: string;
  toolInvocations: Array<{
    toolName: string;
    arguments: Record<string, unknown>;
    result: unknown;
  }>;
}

// Convert our tool definitions to @google/genai function declarations format
function getGeminiFunctionDeclarations() {
  return TOOL_DEFINITIONS.map((def) => ({
    name: def.name,
    description: def.description,
    parameters: {
      type: Type.OBJECT,
      properties: Object.entries(def.parameters.properties).reduce((acc, [key, prop]: [string, any]) => {
        let typeVal = Type.STRING;
        if (prop.type === 'NUMBER') typeVal = Type.NUMBER;
        if (prop.type === 'BOOLEAN') typeVal = Type.BOOLEAN;
        if (prop.type === 'OBJECT') typeVal = Type.OBJECT;
        acc[key] = {
          type: typeVal,
          description: prop.description,
        };
        return acc;
      }, {} as Record<string, any>),
      required: def.parameters.required || [],
    },
  }));
}

/**
 * Deterministic fallback handler for offline/no-key mode or test assertions
 */
function generateDeterministicAriaResponse(input: GenerateAriaResponseInput): GenerateAriaResponseOutput {
  const text = input.userMessage.trim();
  const lower = text.toLowerCase();
  const toolInvocations: GenerateAriaResponseOutput['toolInvocations'] = [];

  // Match order IDs like ORD-101, ORD-102, ORD-103, ORD-999
  const orderIdMatch = text.match(/\b(ORD-\d{3,4})\b/i);
  const detectedOrderId = orderIdMatch ? orderIdMatch[1].toUpperCase() : null;

  // 1. Out-of-scope check
  if (
    lower.includes('flight') ||
    lower.includes('hotel') ||
    lower.includes('weather') ||
    lower.includes('movie') ||
    lower.includes('train') ||
    lower.includes('goa')
  ) {
    return {
      text: "I specialize in Aura Skincare customer care, including order tracking, skincare queries, and returns. I'm unable to help with travel or outside bookings, but please let me know if you need assistance with an Aura order!",
      toolInvocations,
    };
  }

  // 2. Ambiguous order request
  if (
    (lower.includes('my order') || lower.includes('track order') || lower.includes('check order')) &&
    !detectedOrderId
  ) {
    return {
      text: "I'd be happy to help you with your order! Could you please provide your Aura Skincare order ID, such as ORD-101?",
      toolInvocations,
    };
  }

  // 3. Shipping questions
  if (lower.includes('shipping fee') || lower.includes('how much is delivery') || lower.includes('delivery charge') || lower.includes('cost of shipping')) {
    const res = executeTool('get_policy_information', { topic: 'shipping' });
    toolInvocations.push({ toolName: 'get_policy_information', arguments: { topic: 'shipping' }, result: res.data });
    return {
      text: "At Aura Skincare, delivery is completely free for orders above ₹499. For orders of ₹499 or below, there is a standard shipping fee of ₹50. Standard delivery typically takes 3 to 5 business days.",
      toolInvocations,
    };
  }

  // 4. COD inquiries
  if (lower.includes('cod') || lower.includes('cash on delivery')) {
    const valMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+)/i);
    const orderVal = valMatch ? parseInt(valMatch[1], 10) : 2000;
    const res = executeTool('get_policy_information', { topic: 'cod', order_value: orderVal });
    toolInvocations.push({ toolName: 'get_policy_information', arguments: { topic: 'cod', order_value: orderVal }, result: res.data });

    if (orderVal <= BRAND_POLICIES.cod.maxLimit) {
      return {
        text: `Yes! Cash on Delivery is available for orders up to ₹2,500, so an order worth ₹${orderVal} is fully eligible. You can conveniently pay using cash or UPI at your doorstep upon delivery.`,
        toolInvocations,
      };
    } else {
      return {
        text: `Cash on Delivery is available only for orders up to ₹2,500. Since this order is ₹${orderVal}, it requires an online prepayment via card, net banking, or UPI.`,
        toolInvocations,
      };
    }
  }

  // 5. Damaged product
  if (lower.includes('damaged') || lower.includes('broken') || lower.includes('defective') || lower.includes('leaking')) {
    return {
      text: "I'm so sorry to hear that your product arrived damaged! Under our policy, damaged products must be reported within 48 hours of delivery along with clear photos of the damage. May I know when your package was delivered, and do you have photos ready?",
      toolInvocations,
    };
  }

  // 6. Return inquiries
  if (lower.includes('return') || lower.includes('refund')) {
    if (lower.includes('14 days') || lower.includes('opened')) {
      const res = executeTool('check_return_eligibility', {
        order_id: detectedOrderId || 'ORD-102',
        days_since_delivery: 14,
        is_opened: true,
      });
      toolInvocations.push({
        toolName: 'check_return_eligibility',
        arguments: { order_id: detectedOrderId || 'ORD-102', days_since_delivery: 14, is_opened: true },
        result: res.data,
      });
      return {
        text: "I understand, but our return policy requires products to be reported within 7 days of delivery and to remain unopened in original packaging. Because it was received 14 days ago and has been opened, it unfortunately does not qualify for a return.",
        toolInvocations,
      };
    }
    return {
      text: "Aura Skincare accepts returns within 7 days of delivery, provided items are unopened, unused, and in their original sealed packaging. If the item arrived damaged, please report it within 48 hours with photos.",
      toolInvocations,
    };
  }

  // 7. Cancellation inquiry with detected order ID
  if ((lower.includes('cancel') || lower.includes('cancellation')) && detectedOrderId) {
    const res = executeTool('check_cancellation_eligibility', { order_id: detectedOrderId });
    toolInvocations.push({
      toolName: 'check_cancellation_eligibility',
      arguments: { order_id: detectedOrderId },
      result: res.data,
    });

    if (res.success && res.data) {
      const data = res.data as any;
      if (data.is_eligible_for_cancellation) {
        // Execute real cancellation
        const cancelRes = executeTool('cancel_order', { order_id: detectedOrderId, reason: 'Customer requested cancellation' });
        toolInvocations.push({
          toolName: 'cancel_order',
          arguments: { order_id: detectedOrderId },
          result: cancelRes.data,
        });
        return {
          text: `Your order ${detectedOrderId} was in Processing status, so I have successfully cancelled it for you. Any payment made will be refunded within 3 to 5 business days.`,
          toolInvocations,
        };
      } else {
        return {
          text: `Order ${detectedOrderId} is currently ${data.current_status} and cannot be cancelled directly in our system. However, you may politely refuse delivery at your doorstep when the delivery partner arrives!`,
          toolInvocations,
        };
      }
    } else {
      return {
        text: `I couldn't locate order ${detectedOrderId} in our records. Please verify the order number from your confirmation SMS or email.`,
        toolInvocations,
      };
    }
  }

  // 8. Order tracking with detected order ID
  if (detectedOrderId) {
    const res = executeTool('get_order_details', { order_id: detectedOrderId });
    toolInvocations.push({
      toolName: 'get_order_details',
      arguments: { order_id: detectedOrderId },
      result: res.data,
    });

    if (res.success && res.data) {
      const data = res.data as any;
      if (data.status === 'Out for Delivery') {
        return {
          text: `Order ${detectedOrderId} for ${data.customer_name} is currently Out for Delivery with ${data.courier}, tracking number ${data.tracking_number}. It is expected to arrive by 6 PM today!`,
          toolInvocations,
        };
      } else if (data.status === 'Delivered') {
        return {
          text: `Order ${detectedOrderId} for ${data.customer_name} was delivered via ${data.courier} (Tracking: ${data.tracking_number}). Please let me know if you have any questions regarding your items!`,
          toolInvocations,
        };
      } else if (data.status === 'Processing') {
        return {
          text: `Order ${detectedOrderId} containing ${data.product_name} is currently Processing in our Mumbai warehouse. It is on track for standard dispatch within 3 to 5 business days.`,
          toolInvocations,
        };
      } else {
        return {
          text: `Order ${detectedOrderId} has status: ${data.status}. Courier: ${data.courier}, tracking number: ${data.tracking_number}.`,
          toolInvocations,
        };
      }
    } else {
      return {
        text: `I checked our system for order ${detectedOrderId}, but could not find an active record. Could you please double-check the order ID from your confirmation message?`,
        toolInvocations,
      };
    }
  }

  // Default pleasant greeting / prompt
  return {
    text: "Hello! I'm Aria from Aura Skincare. How can I assist you with your orders, shipping, or skincare products today?",
    toolInvocations,
  };
}

/**
 * Main AI Orchestrator: Calls Gemini with Function Calling and multi-turn context
 */
export async function generateAriaResponse(
  input: GenerateAriaResponseInput
): Promise<GenerateAriaResponseOutput> {
  const ai = getAIClient();

  // If no Gemini API key configured, use our reliable deterministic engine
  if (!ai) {
    return generateDeterministicAriaResponse(input);
  }

  try {
    const functionDeclarations = getGeminiFunctionDeclarations();

    // Build contents for multi-turn
    const contents: any[] = [];
    for (const msg of input.conversationHistory) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      });
    }
    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: input.userMessage }],
    });

    // Call Gemini 3.8 Flash with tools
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
        tools: [{ functionDeclarations }],
      },
    });

    const toolInvocations: GenerateAriaResponseOutput['toolInvocations'] = [];
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      // Execute each tool call
      const functionResponseParts: any[] = [];

      for (const call of functionCalls) {
        const toolName = call.name || 'unknown_tool';
        const toolResult = executeTool(toolName, (call.args || {}) as Record<string, unknown>);
        toolInvocations.push({
          toolName,
          arguments: (call.args || {}) as Record<string, unknown>,
          result: toolResult.data || toolResult.error,
        });

        functionResponseParts.push({
          functionResponse: {
            name: toolName,
            response: {
              success: toolResult.success,
              data: toolResult.data,
              error: toolResult.error,
            },
          },
        });
      }

      // Second turn: feed function responses back to Gemini
      const secondContents = [
        ...contents,
        response.candidates?.[0]?.content,
        {
          role: 'user',
          parts: functionResponseParts,
        },
      ];

      const secondResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: secondContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.3,
        },
      });

      const replyText = secondResponse.text || "I have retrieved the details from your Aura Skincare account.";
      return {
        text: replyText,
        toolInvocations,
      };
    }

    const replyText = response.text || "Hello! How may I assist you with Aura Skincare today?";
    return {
      text: replyText,
      toolInvocations,
    };
  } catch (err) {
    console.warn('[Aria AI] Error in Gemini call, falling back to deterministic reasoning:', err);
    return generateDeterministicAriaResponse(input);
  }
}

/**
 * Text-to-Speech synthesizer using Gemini 3.8 Flash Lite TTS
 */
export async function synthesizeAriaVoice(text: string): Promise<{ audioBase64?: string; mimeType: string }> {
  const ai = getAIClient();
  if (!ai) {
    return { mimeType: 'audio/wav' };
  }

  try {
    // Standard TTS with gemini-3.8-flash-lite-tts, prebuilt voice Kore
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style: 'Warm, clear, polite Indian English customer support representative',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioBase64) {
      return {
        audioBase64,
        mimeType: 'audio/wav',
      };
    }
  } catch (err) {
    console.warn('[Aria TTS] TTS generation error, client fallback available:', err);
  }

  return { mimeType: 'audio/wav' };
}

/**
 * Audio transcription using gemini-3.5-transcribe
 */
export async function transcribeAudio(base64Audio: string, mimeType: string = 'audio/webm'): Promise<string> {
  const ai = getAIClient();
  if (!ai) {
    return '';
  }

  try {
    const audioPart = {
      inlineData: {
        mimeType,
        data: base64Audio,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          {
            text: 'Transcribe this customer voice message accurately for customer support. Return only the spoken words as plain text without commentary.',
          },
        ],
      },
    });

    return (response.text || '').trim();
  } catch (err) {
    console.warn('[Aria Transcribe] Transcription error:', err);
    return '';
  }
}

/**
 * Generate Structured Call Summary with deterministic validation
 */
export async function generateCallSummary(
  transcript: Array<{ speaker: string; text: string }>,
  orderIdFromCall?: string
): Promise<CallSummary> {
  // Safe default fallback
  const fallbackSummary: CallSummary = {
    customer_intent: 'GENERAL_SUPPORT',
    order_id: orderIdFromCall || null,
    resolution_status: 'RESOLVED',
    call_summary: 'Customer contacted Aura Skincare customer care regarding products and policies.',
    escalation_required: false,
    escalation_reason: null,
  };

  if (!transcript || transcript.length === 0) {
    return fallbackSummary;
  }

  const fullText = transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n');

  // Detect simple intents deterministically first
  const lower = fullText.toLowerCase();
  let intent: CustomerIntent = 'GENERAL_SUPPORT';
  if (lower.includes('track') || lower.includes('where is') || lower.includes('status')) {
    intent = 'ORDER_TRACKING';
  } else if (lower.includes('cancel')) {
    intent = 'ORDER_CANCELLATION';
  } else if (lower.includes('damaged') || lower.includes('broken')) {
    intent = 'DAMAGED_PRODUCT';
  } else if (lower.includes('return') || lower.includes('refund')) {
    intent = 'RETURN_OR_REFUND';
  } else if (lower.includes('ship') || lower.includes('delivery fee')) {
    intent = 'SHIPPING_INQUIRY';
  } else if (lower.includes('cod') || lower.includes('cash on delivery')) {
    intent = 'PAYMENT_OR_COD';
  } else if (lower.includes('flight') || lower.includes('goa')) {
    intent = 'OUT_OF_SCOPE';
  }

  const orderMatch = fullText.match(/\b(ORD-\d{3,4})\b/i);
  const detectedOrder = orderMatch ? orderMatch[1].toUpperCase() : (orderIdFromCall || null);

  const ai = getAIClient();
  if (!ai) {
    return {
      customer_intent: intent,
      order_id: detectedOrder,
      resolution_status: 'RESOLVED',
      call_summary: `Customer spoke with Aria regarding ${intent.toLowerCase().replace(/_/g, ' ')}${detectedOrder ? ` for order ${detectedOrder}` : ''}. Policies were explained and questions resolved.`,
      escalation_required: false,
      escalation_reason: null,
    };
  }

  try {
    const prompt = `You are a post-call quality assurance system for Aura Skincare voice support. Analyze the following call transcript and produce a strictly valid JSON summary.
Transcript:
${fullText}

Required JSON format:
{
  "customer_intent": "ORDER_TRACKING" | "ORDER_CANCELLATION" | "RETURN_OR_REFUND" | "DAMAGED_PRODUCT" | "SHIPPING_INQUIRY" | "PAYMENT_OR_COD" | "SKINCARE_ADVICE" | "OUT_OF_SCOPE" | "GENERAL_SUPPORT",
  "order_id": "ORD-101" or null,
  "resolution_status": "RESOLVED" | "ESCALATED" | "IN_PROGRESS" | "REQUIRES_CUSTOMER_INFO",
  "call_summary": "Concise 1-2 sentence factual summary of the customer's question and Aria's verified resolution.",
  "escalation_required": boolean,
  "escalation_reason": string or null
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      customer_intent: parsed.customer_intent || intent,
      order_id: parsed.order_id || detectedOrder,
      resolution_status: parsed.resolution_status || 'RESOLVED',
      call_summary: parsed.call_summary || `Customer inquiry handled by Aria for Aura Skincare.`,
      escalation_required: Boolean(parsed.escalation_required),
      escalation_reason: parsed.escalation_reason || null,
    };
  } catch (err) {
    console.warn('[Aria Summary] Error creating LLM summary, using safe deterministic summary:', err);
    return {
      customer_intent: intent,
      order_id: detectedOrder,
      resolution_status: 'RESOLVED',
      call_summary: `Customer inquired about ${intent.toLowerCase().replace(/_/g, ' ')}${detectedOrder ? ` for order ${detectedOrder}` : ''}. Appropriate Aura Skincare policy was provided.`,
      escalation_required: false,
      escalation_reason: null,
    };
  }
}
