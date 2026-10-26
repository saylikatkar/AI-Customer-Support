export type OrderStatus = 'Processing' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string; // e.g. ORD-101
  customerName: string;
  customerPhone?: string;
  productName: string; // Friendly display
  items: OrderItem[];
  value: number; // in INR
  status: OrderStatus;
  courier?: string;
  trackingNumber?: string;
  expectedDelivery?: string;
  orderedAt: string; // ISO string
  deliveredAt?: string; // ISO string if delivered
  isSample: boolean;
  notes?: string;
}

export type CallStatus = 'active' | 'completed' | 'failed';

export interface TranscriptEntry {
  id: string;
  speaker: 'customer' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  toolInvocations?: Array<{
    toolName: string;
    arguments: Record<string, unknown>;
    result: unknown;
  }>;
}

export type CustomerIntent =
  | 'ORDER_TRACKING'
  | 'ORDER_CANCELLATION'
  | 'RETURN_OR_REFUND'
  | 'DAMAGED_PRODUCT'
  | 'SHIPPING_INQUIRY'
  | 'PAYMENT_OR_COD'
  | 'SKINCARE_ADVICE'
  | 'OUT_OF_SCOPE'
  | 'GENERAL_SUPPORT';

export type ResolutionStatus =
  | 'RESOLVED'
  | 'ESCALATED'
  | 'IN_PROGRESS'
  | 'REQUIRES_CUSTOMER_INFO';

export interface CallSummary {
  customer_intent: CustomerIntent;
  order_id?: string | null;
  resolution_status: ResolutionStatus;
  call_summary: string;
  escalation_required: boolean;
  escalation_reason?: string | null;
}

export interface CallRecord {
  id: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  status: CallStatus;
  transcript: TranscriptEntry[];
  summary?: CallSummary;
  associatedOrderId?: string;
  toolExecutions: Array<{
    id: string;
    toolName: string;
    input: Record<string, unknown>;
    output: unknown;
    timestamp: string;
  }>;
}
