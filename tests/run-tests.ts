import { db } from '../src/server/db.ts';
import { executeTool } from '../src/server/tools.ts';
import {
  validateShipping,
  validateReturnEligibility,
  validateCancellationEligibility,
  validateCod,
} from '../src/server/policies.ts';
import { generateAriaResponse, generateCallSummary } from '../src/server/ai.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${details || ''}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('  AURA SKINCARE TEST SUITE EXECUTION   ');
  console.log('========================================\n');

  // Test 1: Seed sample orders
  console.log('--- 1. Sample Order Lookups ---');
  db.seed();
  const ord101 = db.getOrder('ORD-101');
  assert(
    !!ord101 && ord101.customerName === 'Priya Sharma' && ord101.status === 'Out for Delivery' && ord101.courier === 'BlueDart' && ord101.trackingNumber === 'BD-982103',
    'ORD-101 retrieval matches Priya Sharma, BlueDart, Out for Delivery'
  );

  const ord102 = db.getOrder('ORD-102');
  assert(
    !!ord102 && ord102.customerName === 'Rahul Verma' && ord102.status === 'Delivered' && ord102.value === 499,
    'ORD-102 retrieval matches Rahul Verma, Delivered, ₹499'
  );

  const ord103 = db.getOrder('ORD-103');
  assert(
    !!ord103 && ord103.customerName === 'Ananya Patel' && ord103.status === 'Processing' && ord103.value === 850,
    'ORD-103 retrieval matches Ananya Patel, Processing, ₹850'
  );

  // Test 2: Invalid order lookup
  console.log('\n--- 2. Invalid & Missing Order IDs ---');
  const ord999Result = executeTool('get_order_details', { order_id: 'ORD-999' });
  assert(!ord999Result.success, 'ORD-999 lookup fails gracefully with error message');
  const emptyOrderResult = executeTool('get_order_details', { order_id: '' });
  assert(!emptyOrderResult.success, 'Missing order_id fails gracefully');

  // Test 3: Shipping Policy & Boundaries
  console.log('\n--- 3. Shipping Policy Boundaries ---');
  const ship499 = validateShipping(499);
  assert(
    !ship499.qualifiesForFreeShipping && ship499.shippingFee === 50,
    'Strictly-above-₹499 rule: Exactly ₹499 incurs ₹50 shipping fee'
  );

  const ship500 = validateShipping(500);
  assert(
    ship500.qualifiesForFreeShipping && ship500.shippingFee === 0,
    'Order of ₹500 qualifies for free delivery'
  );

  const ship699 = validateShipping(699);
  assert(
    ship699.qualifiesForFreeShipping && ship699.shippingFee === 0,
    'Order of ₹699 qualifies for free delivery'
  );

  // Test 4: COD Policy Boundaries
  console.log('\n--- 4. Cash on Delivery Boundaries ---');
  const cod2000 = validateCod(2000);
  assert(cod2000.eligible, 'COD of ₹2,000 is eligible');

  const cod2500 = validateCod(2500);
  assert(cod2500.eligible, 'Boundary check: COD of exactly ₹2,500 is eligible');

  const cod2501 = validateCod(2501);
  assert(!cod2501.eligible, 'COD above ₹2,500 (₹2,501) is ineligible');

  // Test 5: Return Policy Boundaries
  console.log('\n--- 5. Return & Refund Policy Boundaries ---');
  const return7DaysUnopened = validateReturnEligibility({
    daysSinceDelivery: 7,
    isOpened: false,
  });
  assert(
    return7DaysUnopened.eligible && return7DaysUnopened.action === 'ACCEPT_RETURN',
    'Boundary check: Exactly 7 days unopened is eligible for return'
  );

  const return8DaysUnopened = validateReturnEligibility({
    daysSinceDelivery: 8,
    isOpened: false,
  });
  assert(
    !return8DaysUnopened.eligible && return8DaysUnopened.action === 'REJECT_RETURN',
    '8 days post-delivery is rejected (exceeds 7-day window)'
  );

  const return14DaysOpened = validateReturnEligibility({
    daysSinceDelivery: 14,
    isOpened: true,
  });
  assert(
    !return14DaysOpened.eligible,
    'Sunscreen received 14 days ago and opened (ORD-102 scenario) is strictly rejected'
  );

  // Damaged goods reporting
  const damaged48hWithPhoto = validateReturnEligibility({
    daysSinceDelivery: 2,
    hoursSinceDelivery: 48,
    isOpened: true,
    isDamaged: true,
    hasPhotos: true,
  });
  assert(
    damaged48hWithPhoto.eligible && damaged48hWithPhoto.action === 'ACCEPT_REPLACEMENT_CLAIM',
    'Boundary check: Damaged reported within 48h with photos is eligible for replacement'
  );

  const damaged49h = validateReturnEligibility({
    daysSinceDelivery: 2,
    hoursSinceDelivery: 49,
    isOpened: true,
    isDamaged: true,
    hasPhotos: true,
  });
  assert(
    !damaged49h.eligible,
    'Damaged reported at 49h (exceeding 48h window) is rejected'
  );

  const damagedNoPhoto = validateReturnEligibility({
    daysSinceDelivery: 1,
    hoursSinceDelivery: 24,
    isOpened: false,
    isDamaged: true,
    hasPhotos: false,
  });
  assert(
    damagedNoPhoto.requiresPhotos && damagedNoPhoto.action === 'NEED_MORE_INFO',
    'Damaged reported within window without photos requires photos before approval'
  );

  // Test 6: Cancellation Policy & Mutation
  console.log('\n--- 6. Cancellation Eligibility & Operations ---');
  const cancelProcessing = validateCancellationEligibility('Processing');
  assert(cancelProcessing.eligible, 'Order in Processing status is eligible for cancellation');

  const cancelOutForDelivery = validateCancellationEligibility('Out for Delivery');
  assert(
    !cancelOutForDelivery.eligible && cancelOutForDelivery.canRefuseAtDoorstep,
    'Out for Delivery cannot be cancelled in system; doorstep refusal allowed'
  );

  // Live cancel test on ORD-103
  const cancelOrd103 = executeTool('cancel_order', { order_id: 'ORD-103', reason: 'Customer changed mind' });
  assert(cancelOrd103.success, 'cancel_order executes successfully on Processing order ORD-103');
  const ord103After = db.getOrder('ORD-103');
  assert(ord103After?.status === 'Cancelled', 'ORD-103 status mutated in database to Cancelled');

  // Attempt cancel on ORD-101 (Out for delivery)
  const cancelOrd101 = executeTool('cancel_order', { order_id: 'ORD-101', reason: 'Customer test' });
  assert(!cancelOrd101.success, 'cancel_order refuses to cancel Out for Delivery order ORD-101');

  // Test 7: AI Reasoning & Scenarios (Deterministic Fallback / Offline Safe)
  console.log('\n--- 7. AI Scenario Verification ---');

  // Scenario A: Order tracking
  const trackRes = await generateAriaResponse({
    userMessage: 'Where is order ORD-101?',
    conversationHistory: [],
  });
  assert(
    trackRes.text.includes('ORD-101') &&
      (trackRes.text.includes('BlueDart') || trackRes.text.includes('Out for Delivery')),
    'Scenario: Where is order ORD-101? Aria retrieves BlueDart and Out for Delivery'
  );

  // Scenario B: Invalid order
  const invalidRes = await generateAriaResponse({
    userMessage: 'Track ORD-999',
    conversationHistory: [],
  });
  assert(
    invalidRes.text.toLowerCase().includes('could not') ||
      invalidRes.text.toLowerCase().includes('not find') ||
      invalidRes.text.toLowerCase().includes('verify'),
    'Scenario: Track ORD-999 asks customer to verify ID'
  );

  // Scenario C: Out-of-scope request
  const outOfScopeRes = await generateAriaResponse({
    userMessage: 'Book me a flight to Goa.',
    conversationHistory: [],
  });
  assert(
    outOfScopeRes.text.includes('Aura Skincare') &&
      (outOfScopeRes.text.toLowerCase().includes('unable') || outOfScopeRes.text.toLowerCase().includes('specialize')),
    'Scenario: Flight to Goa is politely redirected to Aura Skincare customer care'
  );

  // Scenario D: Ambiguous order request
  const ambiguousRes = await generateAriaResponse({
    userMessage: 'Can you help me with my order?',
    conversationHistory: [],
  });
  assert(
    ambiguousRes.text.includes('order ID') || ambiguousRes.text.includes('ORD-101'),
    'Scenario: Ambiguous "help me with my order" asks for the specific order ID'
  );

  // Scenario E: Shipping cost
  const shippingRes = await generateAriaResponse({
    userMessage: 'How much is delivery?',
    conversationHistory: [],
  });
  assert(
    shippingRes.text.includes('499') && shippingRes.text.includes('50'),
    'Scenario: How much is delivery? explains ₹50 fee and free shipping above ₹499'
  );

  // Scenario F: COD inquiry
  const codRes = await generateAriaResponse({
    userMessage: 'Can I pay cash on delivery for an order worth ₹2,000?',
    conversationHistory: [],
  });
  assert(
    codRes.text.includes('2,500') || codRes.text.includes('eligible') || codRes.text.includes('Yes'),
    'Scenario: COD for ₹2,000 confirmed within ₹2,500 limit'
  );

  // Test 8: Call Persistence, Transcripts & Summaries
  console.log('\n--- 8. Call Lifecycle, Transcripts & Summaries ---');
  const newCall = db.createCall('Hello! How can I help?');
  assert(!!newCall.id && newCall.status === 'active', 'Call created with active status and ID');

  db.appendTranscript(newCall.id, 'customer', 'Where is my order ORD-101?');
  db.appendTranscript(newCall.id, 'assistant', 'Order ORD-101 is out for delivery with BlueDart.');
  const callRecord = db.getCall(newCall.id);
  assert(callRecord?.transcript.length === 3, 'Transcript chronologically stores entries');

  const summary = await generateCallSummary(
    callRecord!.transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
    'ORD-101'
  );
  assert(
    summary.customer_intent === 'ORDER_TRACKING' && summary.order_id === 'ORD-101',
    'Call summary extracts ORDER_TRACKING and ORD-101'
  );

  const finalizedCall = db.endCall(newCall.id, summary, 'ORD-101');
  assert(
    finalizedCall?.status === 'completed' && finalizedCall?.summary?.resolution_status === 'RESOLVED',
    'Call finalized with completed status and resolution_status RESOLVED'
  );

  // Test idempotency of ending call
  const idempotentEnd = db.endCall(newCall.id);
  assert(idempotentEnd?.status === 'completed', 'Finalizing call is idempotent');

  console.log('\n========================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
