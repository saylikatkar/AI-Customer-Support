/**
 * Authoritative Aura Skincare Brand Policies & Deterministic Validators
 */

export const BRAND_POLICIES = {
  brandName: 'Aura Skincare',
  assistantName: 'Aria',
  shipping: {
    freeShippingThreshold: 499, // STRICTLY above 499 (orderValue > 499)
    standardFee: 50,
    deliveryWindowDays: '3–5 business days',
    description: 'Orders strictly above ₹499 qualify for free delivery. Orders of ₹499 or below incur a ₹50 shipping fee. Standard delivery takes 3–5 business days.',
  },
  returns: {
    returnWindowDays: 7, // exactly 7 days is inside window
    unopenedRequired: true,
    damageReportWindowHours: 48, // exactly 48 hours is inside window
    photoEvidenceRequired: true,
    description: 'Returns are accepted within 7 days of delivery for unopened, unused products in original packaging. Damaged or defective items must be reported within 48 hours of delivery with photos for replacement.',
  },
  cancellation: {
    eligibleStatus: 'Processing',
    ineligibleStatuses: ['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    doorstepRefusalAllowed: true,
    description: 'Orders can only be cancelled while in Processing status. Once Shipped or Out for Delivery, orders cannot be cancelled in the system, but customers may refuse delivery at the doorstep.',
  },
  cod: {
    maxLimit: 2500, // up to ₹2,500
    paymentMethods: ['Cash', 'UPI at doorstep'],
    description: 'Cash on Delivery (COD) is available for orders up to ₹2,500. Customers can pay via cash or UPI at the doorstep.',
  },
};

export interface ShippingValidationResult {
  orderValue: number;
  qualifiesForFreeShipping: boolean;
  shippingFee: number;
  deliveryEstimate: string;
  explanation: string;
}

export function validateShipping(orderValue: number): ShippingValidationResult {
  const qualifies = orderValue > BRAND_POLICIES.shipping.freeShippingThreshold;
  const fee = qualifies ? 0 : BRAND_POLICIES.shipping.standardFee;
  return {
    orderValue,
    qualifiesForFreeShipping: qualifies,
    shippingFee: fee,
    deliveryEstimate: BRAND_POLICIES.shipping.deliveryWindowDays,
    explanation: qualifies
      ? `An order of ₹${orderValue} is above the ₹499 threshold and qualifies for Free Standard Delivery (${BRAND_POLICIES.shipping.deliveryWindowDays}).`
      : `An order of ₹${orderValue} does not exceed the ₹499 threshold and incurs a standard shipping fee of ₹50. Standard delivery is ${BRAND_POLICIES.shipping.deliveryWindowDays}. (Note: Orders must be strictly above ₹499 for free delivery; exactly ₹499 incurs the ₹50 fee).`,
  };
}

export interface ReturnEligibilityInput {
  daysSinceDelivery: number;
  isOpened: boolean;
  isDamaged?: boolean;
  hoursSinceDelivery?: number;
  hasPhotos?: boolean;
}

export interface ReturnEligibilityResult {
  eligible: boolean;
  requiresPhotos: boolean;
  action: 'ACCEPT_RETURN' | 'ACCEPT_REPLACEMENT_CLAIM' | 'REJECT_RETURN' | 'NEED_MORE_INFO';
  reason: string;
}

export function validateReturnEligibility(input: ReturnEligibilityInput): ReturnEligibilityResult {
  // If reported as damaged/defective
  if (input.isDamaged) {
    const hours = input.hoursSinceDelivery !== undefined ? input.hoursSinceDelivery : input.daysSinceDelivery * 24;
    if (hours <= BRAND_POLICIES.returns.damageReportWindowHours) {
      if (input.hasPhotos) {
        return {
          eligible: true,
          requiresPhotos: false,
          action: 'ACCEPT_REPLACEMENT_CLAIM',
          reason: `Reported within ${hours} hours of delivery (within the 48-hour limit) with photo evidence. Replacement claim initiated.`,
        };
      }
      return {
        eligible: false,
        requiresPhotos: true,
        action: 'NEED_MORE_INFO',
        reason: `Reported within ${hours} hours of delivery (within the 48-hour limit). Clear photos of the damaged item and packaging are required before a replacement can be approved.`,
      };
    } else {
      return {
        eligible: false,
        requiresPhotos: false,
        action: 'REJECT_RETURN',
        reason: `Damaged products must be reported within 48 hours of delivery. This report was made at ${hours} hours post-delivery, so it is outside the replacement window.`,
      };
    }
  }

  // Standard return
  if (input.daysSinceDelivery > BRAND_POLICIES.returns.returnWindowDays) {
    return {
      eligible: false,
      requiresPhotos: false,
      action: 'REJECT_RETURN',
      reason: `The return request is at ${input.daysSinceDelivery} days after delivery, which exceeds our 7-day return window.`,
    };
  }

  if (input.isOpened) {
    return {
      eligible: false,
      requiresPhotos: false,
      action: 'REJECT_RETURN',
      reason: `Our return policy requires items to be unopened, unused, and in their original sealed packaging for hygiene and safety reasons.`,
    };
  }

  return {
    eligible: true,
    requiresPhotos: false,
    action: 'ACCEPT_RETURN',
    reason: `The order was delivered ${input.daysSinceDelivery} days ago (within 7 days) and the product is unopened in original packaging. The return is eligible.`,
  };
}

export interface CancellationEligibilityResult {
  eligible: boolean;
  status: string;
  canRefuseAtDoorstep: boolean;
  reason: string;
}

export function validateCancellationEligibility(status: string): CancellationEligibilityResult {
  if (status === 'Processing') {
    return {
      eligible: true,
      status,
      canRefuseAtDoorstep: false,
      reason: `Order is currently in 'Processing' status and is eligible for immediate cancellation.`,
    };
  }

  if (status === 'Shipped' || status === 'Out for Delivery') {
    return {
      eligible: false,
      status,
      canRefuseAtDoorstep: true,
      reason: `Order is already '${status}' and cannot be cancelled in our system. However, the customer may refuse delivery at the doorstep when the courier arrives.`,
    };
  }

  if (status === 'Delivered') {
    return {
      eligible: false,
      status,
      canRefuseAtDoorstep: false,
      reason: `Order has already been Delivered. It cannot be cancelled, but an unopened product may be returned within 7 days.`,
    };
  }

  if (status === 'Cancelled') {
    return {
      eligible: false,
      status,
      canRefuseAtDoorstep: false,
      reason: `Order has already been cancelled.`,
    };
  }

  return {
    eligible: false,
    status,
    canRefuseAtDoorstep: false,
    reason: `Order with status '${status}' is not eligible for cancellation.`,
  };
}

export interface CodValidationResult {
  orderValue: number;
  eligible: boolean;
  reason: string;
}

export function validateCod(orderValue: number): CodValidationResult {
  const eligible = orderValue <= BRAND_POLICIES.cod.maxLimit;
  return {
    orderValue,
    eligible,
    reason: eligible
      ? `Cash on Delivery is available for ₹${orderValue} (limit is ₹2,500). Customers can pay via Cash or UPI at the doorstep.`
      : `Cash on Delivery is only available for orders up to ₹2,500. For an order value of ₹${orderValue}, online payment is required.`,
  };
}
