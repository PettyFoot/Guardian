import Stripe from 'stripe';
import crypto from 'crypto';

// Test webhook signature verification
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  console.error('STRIPE_WEBHOOK_SECRET is not set');
  process.exit(1);
}

// Create a test webhook payload
const testPayload = {
  id: 'evt_test_' + Date.now(),
  object: 'event',
  api_version: '2025-07-30.basil',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'pi_test_' + Date.now(),
      object: 'payment_intent',
      amount: 100,
      currency: 'usd',
      status: 'succeeded',
      metadata: {
        type: 'inbox_access',
        senderEmail: 'test@example.com',
        targetEmail: 'target@example.com',
        userId: 'test-user-id'
      }
    }
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: null,
    idempotency_key: null
  },
  type: 'payment_intent.succeeded'
};

// Convert to JSON string
const payloadString = JSON.stringify(testPayload);

// Create timestamp
const timestamp = Math.floor(Date.now() / 1000);

// Create signature
const signedPayload = `${timestamp}.${payloadString}`;
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(signedPayload, 'utf8')
  .digest('hex');

const stripeSignature = `t=${timestamp},v1=${signature}`;

console.log('Test webhook payload:', payloadString);
console.log('Stripe signature:', stripeSignature);

// Test verification
try {
  const event = stripe.webhooks.constructEvent(
    Buffer.from(payloadString, 'utf8'),
    stripeSignature,
    webhookSecret
  );
  
  console.log('✅ Webhook signature verification successful!');
  console.log('Event type:', event.type);
  console.log('Event ID:', event.id);
} catch (err) {
  console.error('❌ Webhook signature verification failed:', err.message);
}

console.log('\nTesting with raw body buffer...');
try {
  const rawBody = Buffer.from(payloadString, 'utf8');
  const event = stripe.webhooks.constructEvent(
    rawBody,
    stripeSignature,
    webhookSecret
  );
  
  console.log('✅ Raw body verification successful!');
} catch (err) {
  console.error('❌ Raw body verification failed:', err.message);
}
