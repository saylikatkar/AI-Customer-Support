export type AgentState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'ended'
  | 'error';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  productName: string;
  items: OrderItem[];
  value: number;
  status: 'Processing' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  courier?: string;
  trackingNumber?: string;
  expectedDelivery?: string;
  orderedAt: string;
  deliveredAt?: string;
  isSample: boolean;
  notes?: string;
}

export interface ToolInvocation {
  toolName: string;
  arguments: Record<string, unknown>;
  result: unknown;
}

export interface Message {
  id: string;
  speaker: 'customer' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  isInterim?: boolean;
  toolInvocations?: ToolInvocation[];
}

export interface CallSummary {
  customer_intent: string;
  order_id?: string | null;
  resolution_status: 'RESOLVED' | 'ESCALATED' | 'IN_PROGRESS' | 'REQUIRES_CUSTOMER_INFO';
  call_summary: string;
  escalation_required: boolean;
  escalation_reason?: string | null;
}

export interface CallRecord {
  id: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  status: 'active' | 'completed' | 'failed';
  transcript: Message[];
  summary?: CallSummary;
  associatedOrderId?: string;
  toolExecutions?: Array<{
    id: string;
    toolName: string;
    input: Record<string, unknown>;
    output: unknown;
    timestamp: string;
  }>;
}
