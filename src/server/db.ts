import { Order, CallRecord, TranscriptEntry, CallSummary } from './types.ts';

// Initial test sample records specified in prompt
export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-101',
    customerName: 'Priya Sharma',
    customerPhone: '+91 98765 43210',
    productName: 'Vitamin C Serum (30ml)',
    items: [
      {
        id: 'SKU-VITC-30',
        name: 'Aura Vitamin C Radiance Serum (30ml)',
        quantity: 1,
        price: 699,
      },
    ],
    value: 699,
    status: 'Out for Delivery',
    courier: 'BlueDart',
    trackingNumber: 'BD-982103',
    expectedDelivery: 'By 6 PM today',
    orderedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isSample: true,
    notes: 'Out for delivery with BlueDart agent. Delivery scheduled by 6 PM today.',
  },
  {
    id: 'ORD-102',
    customerName: 'Rahul Verma',
    customerPhone: '+91 98123 45678',
    productName: 'Hydrating Sunscreen SPF 50',
    items: [
      {
        id: 'SKU-SUN-50',
        name: 'Aura Ultra-Light Hydrating Sunscreen SPF 50 PA++++',
        quantity: 1,
        price: 499,
      },
    ],
    value: 499,
    status: 'Delivered',
    courier: 'Delhivery',
    trackingNumber: 'DL-441029',
    orderedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
    deliveredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // Delivered 14 days ago
    isSample: true,
    notes: 'Delivered 14 days ago. Outside the 7-day return policy window.',
  },
  {
    id: 'ORD-103',
    customerName: 'Ananya Patel',
    customerPhone: '+91 99001 22334',
    productName: 'Green Tea Face Wash + Toner',
    items: [
      {
        id: 'SKU-GT-WASH',
        name: 'Aura Gentle Green Tea Antioxidant Face Wash (150ml)',
        quantity: 1,
        price: 399,
      },
      {
        id: 'SKU-GT-TONER',
        name: 'Aura Balancing Green Tea Clarifying Toner (120ml)',
        quantity: 1,
        price: 451,
      },
    ],
    value: 850,
    status: 'Processing',
    orderedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // Ordered 3 hours ago
    isSample: true,
    notes: 'Ordered 3 hours ago. Currently processing in warehouse. Eligible for immediate cancellation.',
  },
];

class Database {
  private orders: Map<string, Order> = new Map();
  private calls: Map<string, CallRecord> = new Map();

  constructor() {
    this.seed();
  }

  public seed(): void {
    this.orders.clear();
    for (const order of INITIAL_ORDERS) {
      this.orders.set(order.id, { ...order });
    }
  }

  // --- Orders ---
  public getOrder(orderId: string): Order | undefined {
    const normalized = orderId.trim().toUpperCase();
    return this.orders.get(normalized);
  }

  public listOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  public updateOrderStatus(orderId: string, status: Order['status'], note?: string): Order | undefined {
    const normalized = orderId.trim().toUpperCase();
    const existing = this.orders.get(normalized);
    if (!existing) return undefined;
    existing.status = status;
    if (note) {
      existing.notes = note;
    }
    this.orders.set(normalized, existing);
    return existing;
  }

  // --- Calls ---
  public createCall(initialGreeting?: string): CallRecord {
    const id = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const newCall: CallRecord = {
      id,
      startTime: now,
      durationSeconds: 0,
      status: 'active',
      transcript: [],
      toolExecutions: [],
    };

    if (initialGreeting) {
      newCall.transcript.push({
        id: `t_${Date.now()}_0`,
        speaker: 'assistant',
        text: initialGreeting,
        timestamp: now,
      });
    }

    this.calls.set(id, newCall);
    return newCall;
  }

  public getCall(callId: string): CallRecord | undefined {
    return this.calls.get(callId);
  }

  public listCalls(): CallRecord[] {
    return Array.from(this.calls.values()).sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  public appendTranscript(
    callId: string,
    speaker: 'customer' | 'assistant' | 'system',
    text: string,
    toolInvocations?: TranscriptEntry['toolInvocations']
  ): TranscriptEntry | undefined {
    const call = this.calls.get(callId);
    if (!call) return undefined;

    const entry: TranscriptEntry = {
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      speaker,
      text,
      timestamp: new Date().toISOString(),
      toolInvocations,
    };

    call.transcript.push(entry);
    return entry;
  }

  public recordToolExecution(
    callId: string,
    toolName: string,
    input: Record<string, unknown>,
    output: unknown
  ): void {
    const call = this.calls.get(callId);
    if (!call) return;

    call.toolExecutions.push({
      id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      toolName,
      input,
      output,
      timestamp: new Date().toISOString(),
    });
  }

  public endCall(callId: string, summary?: CallSummary, associatedOrderId?: string): CallRecord | undefined {
    const call = this.calls.get(callId);
    if (!call) return undefined;

    if (call.status === 'completed') {
      return call; // Idempotent finalization
    }

    const endTime = new Date().toISOString();
    call.endTime = endTime;
    call.status = 'completed';
    const duration = Math.max(
      1,
      Math.round((new Date(endTime).getTime() - new Date(call.startTime).getTime()) / 1000)
    );
    call.durationSeconds = duration;

    if (summary) {
      call.summary = summary;
    }
    if (associatedOrderId) {
      call.associatedOrderId = associatedOrderId;
    }

    return call;
  }

  public updateCallSummary(callId: string, summary: CallSummary): void {
    const call = this.calls.get(callId);
    if (call) {
      call.summary = summary;
      if (summary.order_id) {
        call.associatedOrderId = summary.order_id;
      }
    }
  }
}

export const db = new Database();
