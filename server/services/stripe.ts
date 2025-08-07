import Stripe from 'stripe';

let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

export class StripeService {
  async createPaymentLink(senderEmail: string, pendingEmailId: string): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please provide STRIPE_SECRET_KEY.');
    }
    
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 100, // $1.00
          product_data: {
            name: 'Email Access Fee',
            description: `Grant access to send emails to this inbox. Payment from: ${senderEmail}`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        sender_email: senderEmail,
        pending_email_id: pendingEmailId,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/donation-success`
        }
      },
    });

    return paymentLink.url;
  }

  async createCheckoutSession(senderEmail: string, pendingEmailId: string): Promise<{ sessionId: string; url: string }> {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please provide STRIPE_SECRET_KEY.');
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 100, // $1.00
          product_data: {
            name: 'Email Access Fee',
            description: `Grant access to send emails to this inbox`,
          },
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/donation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/donation-cancelled`,
      metadata: {
        sender_email: senderEmail,
        pending_email_id: pendingEmailId,
      },
      customer_email: senderEmail,
    });

    return {
      sessionId: session.id,
      url: session.url!
    };
  }

  async getSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please provide STRIPE_SECRET_KEY.');
    }
    
    return await stripe.checkout.sessions.retrieve(sessionId);
  }

  async constructEvent(body: string, signature: string): Promise<Stripe.Event> {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please provide STRIPE_SECRET_KEY.');
    }
    
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET');
    }
    
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }
}

export const stripeService = new StripeService();
