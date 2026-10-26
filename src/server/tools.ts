import { db } from './db.ts';
import {
  validateCancellationEligibility,
  validateReturnEligibility,
  validateShipping,
  validateCod,
  BRAND_POLICIES,
} from './policies.ts';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const TOOL_DEFINITIONS = [
  {
    name: 'get_order_details',
    description: 'Retrieve real verified order details, items, pricing, delivery status, courier info, and timestamps for an Aura Skincare order ID (e.g. ORD-101, ORD-102, ORD-103).',
    parameters: {
      type: 'OBJECT',
      properties: {
        order_id: {
          type: 'STRING',
          description: 'The Aura Skincare order identifier, such as ORD-101.',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'check_cancellation_eligibility',
    description: 'Check whether an order can be cancelled based on its current live database status. Only orders in "Processing" status can be cancelled.',
    parameters: {
      type: 'OBJECT',
      properties: {
        order_id: {
          type: 'STRING',
          description: 'The order identifier to inspect for cancellation eligibility.',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'cancel_order',
    description: 'Perform an authorized cancellation of an order that is currently in Processing status. Mutates order status in database to Cancelled.',
    parameters: {
      type: 'OBJECT',
      properties: {
        order_id: {
          type: 'STRING',
          description: 'The order identifier to cancel.',
        },
        reason: {
          type: 'STRING',
          description: 'The customer-provided reason for cancellation.',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'check_return_eligibility',
    description: 'Evaluate return or replacement eligibility against authoritative Aura Skincare return policies (7-day unopened window, or 48-hour damaged report with photos).',
    parameters: {
      type: 'OBJECT',
      properties: {
        order_id: {
          type: 'STRING',
          description: 'The order ID being evaluated.',
        },
        days_since_delivery: {
          type: 'NUMBER',
          description: 'Number of days elapsed since delivery.',
        },
        is_opened: {
          type: 'BOOLEAN',
          description: 'Whether the skincare product packaging has been unsealed or opened.',
        },
        is_damaged: {
          type: 'BOOLEAN',
          description: 'Whether the product arrived defective or damaged.',
        },
        hours_since_delivery: {
          type: 'NUMBER',
          description: 'Hours since delivery if reporting damage (must be <= 48 hours).',
        },
        has_photos: {
          type: 'BOOLEAN',
          description: 'Whether the customer has provided photo evidence of the damage.',
        },
      },
      required: ['order_id', 'is_opened'],
    },
  },
  {
    name: 'get_tracking_information',
    description: 'Fetch live courier tracking details, tracking number, courier partner name, and delivery milestone for an order.',
    parameters: {
      type: 'OBJECT',
      properties: {
        order_id: {
          type: 'STRING',
          description: 'The order ID to look up tracking for.',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'get_policy_information',
    description: 'Look up official Aura Skincare brand policies for shipping thresholds, fees, return windows, damage reporting, or Cash on Delivery limits.',
    parameters: {
      type: 'OBJECT',
      properties: {
        topic: {
          type: 'STRING',
          description: 'The policy topic to look up: "shipping", "returns", "cancellation", or "cod".',
        },
        order_value: {
          type: 'NUMBER',
          description: 'Optional cart or order value in INR to calculate exact fee or COD eligibility.',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'escalate_customer_request',
    description: 'Escalate an unresolved issue, complex claim, or special exception to a senior human Aura Skincare support lead.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reason: {
          type: 'STRING',
          description: 'Detailed reason for escalating the conversation to human support.',
        },
        conversation_id: {
          type: 'STRING',
          description: 'Current call or conversation identifier.',
        },
        priority: {
          type: 'STRING',
          description: 'Escalation priority: "normal", "high", "urgent".',
        },
      },
      required: ['reason'],
    },
  },
];

export interface ToolExecutionResponse {
  success: boolean;
  toolName: string;
  data?: unknown;
  error?: string;
}

export function executeTool(name: string, args: Record<string, unknown>): ToolExecutionResponse {
  try {
    switch (name) {
      case 'get_order_details': {
        const orderId = String(args.order_id || '').trim().toUpperCase();
        if (!orderId) {
          return {
            success: false,
            toolName: name,
            error: 'Missing order_id. Please provide a valid order ID such as ORD-101.',
          };
        }

        const order = db.getOrder(orderId);
        if (!order) {
          return {
            success: false,
            toolName: name,
            error: `Order ${orderId} could not be located in our system. Please ask the customer to check their order confirmation email or SMS for the correct ID.`,
          };
        }

        // Compute helper indicators
        const cancellation = validateCancellationEligibility(order.status);
        let returnEligibility = null;
        if (order.status === 'Delivered') {
          returnEligibility = validateReturnEligibility({
            daysSinceDelivery: 14, // ORD-102 default sample
            isOpened: true,
          });
        }

        return {
          success: true,
          toolName: name,
          data: {
            order_id: order.id,
            customer_name: order.customerName,
            product_name: order.productName,
            items: order.items,
            order_value_inr: order.value,
            status: order.status,
            courier: order.courier || 'Pending assignment',
            tracking_number: order.trackingNumber || 'Pending',
            expected_delivery: order.expectedDelivery || (order.status === 'Delivered' ? 'Delivered' : '3-5 business days'),
            cancellation_eligible: cancellation.eligible,
            cancellation_note: cancellation.reason,
            notes: order.notes,
            is_sample_record: order.isSample,
          },
        };
      }

      case 'check_cancellation_eligibility': {
        const orderId = String(args.order_id || '').trim().toUpperCase();
        const order = db.getOrder(orderId);
        if (!order) {
          return {
            success: false,
            toolName: name,
            error: `Order ${orderId} not found in database.`,
          };
        }

        const check = validateCancellationEligibility(order.status);
        return {
          success: true,
          toolName: name,
          data: {
            order_id: order.id,
            current_status: order.status,
            is_eligible_for_cancellation: check.eligible,
            reason: check.reason,
            can_refuse_at_doorstep: check.canRefuseAtDoorstep,
          },
        };
      }

      case 'cancel_order': {
        const orderId = String(args.order_id || '').trim().toUpperCase();
        const reason = String(args.reason || 'Customer requested cancellation via voice support');
        const order = db.getOrder(orderId);
        if (!order) {
          return {
            success: false,
            toolName: name,
            error: `Order ${orderId} not found. Cannot cancel.`,
          };
        }

        const check = validateCancellationEligibility(order.status);
        if (!check.eligible) {
          return {
            success: false,
            toolName: name,
            error: `Order ${orderId} cannot be cancelled because its current status is "${order.status}". ${check.reason}`,
          };
        }

        const updated = db.updateOrderStatus(orderId, 'Cancelled', `Cancelled by customer: ${reason}`);
        return {
          success: true,
          toolName: name,
          data: {
            order_id: orderId,
            previous_status: 'Processing',
            new_status: 'Cancelled',
            cancellation_timestamp: new Date().toISOString(),
            message: `Order ${orderId} has been successfully cancelled. Any payments made will be refunded to the original payment source within 3–5 business days.`,
          },
        };
      }

      case 'check_return_eligibility': {
        const days = Number(args.days_since_delivery ?? 0);
        const isOpened = Boolean(args.is_opened);
        const isDamaged = Boolean(args.is_damaged);
        const hours = args.hours_since_delivery !== undefined ? Number(args.hours_since_delivery) : undefined;
        const hasPhotos = Boolean(args.has_photos);

        const result = validateReturnEligibility({
          daysSinceDelivery: days,
          isOpened,
          isDamaged,
          hoursSinceDelivery: hours,
          hasPhotos,
        });

        return {
          success: true,
          toolName: name,
          data: {
            order_id: args.order_id,
            is_eligible: result.eligible,
            recommended_action: result.action,
            requires_photos: result.requiresPhotos,
            policy_explanation: result.reason,
          },
        };
      }

      case 'get_tracking_information': {
        const orderId = String(args.order_id || '').trim().toUpperCase();
        const order = db.getOrder(orderId);
        if (!order) {
          return {
            success: false,
            toolName: name,
            error: `Order ${orderId} not found. Unable to fetch tracking data.`,
          };
        }

        return {
          success: true,
          toolName: name,
          data: {
            order_id: order.id,
            status: order.status,
            courier: order.courier,
            tracking_number: order.trackingNumber,
            expected_delivery: order.expectedDelivery || (order.status === 'Delivered' ? 'Delivered' : '3-5 business days'),
            tracking_url: order.trackingNumber ? `https://track.auraskincare.in/${order.courier?.toLowerCase()}/${order.trackingNumber}` : null,
            live_status_note: order.notes,
          },
        };
      }

      case 'get_policy_information': {
        const topic = String(args.topic || '').toLowerCase();
        const orderVal = args.order_value !== undefined ? Number(args.order_value) : undefined;

        if (topic.includes('ship')) {
          if (orderVal !== undefined) {
            return {
              success: true,
              toolName: name,
              data: validateShipping(orderVal),
            };
          }
          return {
            success: true,
            toolName: name,
            data: BRAND_POLICIES.shipping,
          };
        }

        if (topic.includes('return') || topic.includes('refund')) {
          return {
            success: true,
            toolName: name,
            data: BRAND_POLICIES.returns,
          };
        }

        if (topic.includes('cancel')) {
          return {
            success: true,
            toolName: name,
            data: BRAND_POLICIES.cancellation,
          };
        }

        if (topic.includes('cod') || topic.includes('cash') || topic.includes('payment')) {
          if (orderVal !== undefined) {
            return {
              success: true,
              toolName: name,
              data: validateCod(orderVal),
            };
          }
          return {
            success: true,
            toolName: name,
            data: BRAND_POLICIES.cod,
          };
        }

        return {
          success: true,
          toolName: name,
          data: BRAND_POLICIES,
        };
      }

      case 'escalate_customer_request': {
        const reason = String(args.reason || 'Customer requested human assistance');
        const convId = String(args.conversation_id || 'active');
        const priority = String(args.priority || 'normal');

        const ticketId = `ESC-${Date.now().toString().slice(-6)}`;
        return {
          success: true,
          toolName: name,
          data: {
            ticket_id: ticketId,
            escalated_at: new Date().toISOString(),
            reason,
            conversation_id: convId,
            priority,
            message: `Ticket ${ticketId} created. An Aura Skincare Senior Support Specialist will review this conversation within 2 hours.`,
          },
        };
      }

      default:
        return {
          success: false,
          toolName: name,
          error: `Unknown tool function "${name}".`,
        };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      toolName: name,
      error: `Error executing tool ${name}: ${message}`,
    };
  }
}
