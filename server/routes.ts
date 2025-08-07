import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { gmailService } from "./services/gmail";
import { stripeService } from "./services/stripe";
import { emailProcessor } from "./services/email-processor";
import { insertUserSchema, insertContactSchema } from "@shared/schema";
import Stripe from "stripe";

// Initialize Stripe (optional)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-07-30.basil",
  });
  console.log('Stripe initialized successfully');
} else {
  console.warn('Stripe secret key not found - payment features will be disabled');
}

// Auto-processing scheduler
let processingInterval: NodeJS.Timeout | null = null;

async function startAutoProcessing() {
  if (processingInterval) return; // Already running

  console.log(`[${new Date().toISOString()}] Starting auto-processing...`);

  processingInterval = setInterval(async () => {
    console.log(`[${new Date().toISOString()}] Tick - Checking for users...`);
    
    try {
      const users = await storage.getAllUsers();
      console.log(`[${new Date().toISOString()}] Found ${users.length} users`);

      for (const user of users) {
        try {
          if (!user.gmailToken) {
            console.log(`[${user.id}] Skipping user (no Gmail token)`);
            continue;
          }

          const intervalMinutes = parseFloat(user.emailCheckInterval || "1.0");
          const lastCheckTime = user.lastEmailCheck ? new Date(user.lastEmailCheck) : new Date(0);
          const timeSinceLastCheck = Date.now() - lastCheckTime.getTime();
          const intervalMs = intervalMinutes * 60 * 1000;

          console.log(`[${user.id}] Last checked: ${lastCheckTime.toISOString()} | Interval: ${intervalMinutes} min | Time since: ${timeSinceLastCheck} ms`);

          if (timeSinceLastCheck >= intervalMs) {
            console.log(`[${user.id}] Time to process emails`);

            const { EmailProcessor } = await import('./services/email-processor');
            const emailProcessor = new EmailProcessor();

            console.log(`[${user.id}] Starting email processing`);
            await emailProcessor.processNewEmails(user);
            console.log(`[${user.id}] Finished email processing`);

            await storage.updateUserLastEmailCheck(user.id, new Date());
            console.log(`[${user.id}] Updated last email check time`);
          } else {
            console.log(`[${user.id}] Not enough time passed, skipping`);
          }
        } catch (userError: any) {
          console.error(`[${user.id}] Error processing user:`, userError?.stack || userError);
        }
      }

    } catch (error: any) {
      console.error(`[GLOBAL] Auto-processing error:`, error?.stack || error);
    }
  }, 30 * 1000); // Every 30 seconds
}


export async function registerRoutes(app: Express): Promise<Server> {
  // Start auto-processing when server starts
  startAutoProcessing();
  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching users: " + error.message });
    }
  });

  app.get("/api/user/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching user: " + error.message });
    }
  });

  app.delete("/api/user/:id", async (req, res) => {
    try {
      console.log('Delete user request received for ID:', req.params.id);
      const { id } = req.params;
      const user = await storage.getUser(id);
      
      if (!user) {
        console.error('User not found for deletion:', id);
        return res.status(404).json({ message: "User not found" });
      }

      // Revoke Gmail tokens if they exist
      if (user.gmailRefreshToken) {
        try {
          console.log('Revoking Gmail tokens before account deletion...');
          await gmailService.revokeTokens(user.gmailRefreshToken);
          console.log('Gmail tokens revoked successfully');
        } catch (error: any) {
          console.error('Google token revocation failed during deletion:', error.message);
        }
      }

      // Delete user and all associated data (cascade will handle contacts, emails, etc.)
      console.log('Deleting user from database...');
      await storage.deleteUser(id);
      console.log('User deleted successfully');

      res.json({ message: "User account deleted successfully" });
    } catch (error: any) {
      console.error('Error in delete user endpoint:', error);
      res.status(500).json({ message: "Error deleting user: " + error.message });
    }
  });

  // User settings routes
  app.patch("/api/user/:id/email-check-interval", async (req, res) => {
    try {
      const { id } = req.params;
      const { intervalMinutes } = req.body;
      
      if (!intervalMinutes || intervalMinutes < 0.5 || intervalMinutes > 60) {
        return res.status(400).json({ message: "Interval must be between 0.5 and 60 minutes" });
      }
      
      const user = await storage.updateUserEmailCheckInterval(id, intervalMinutes);
      res.json({ message: "Email check interval updated", user });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating email check interval: " + error.message });
    }
  });

  app.patch("/api/user/:id/charity-name", async (req, res) => {
    try {
      const { id } = req.params;
      const { charityName } = req.body;
      
      if (!charityName || charityName.trim().length === 0) {
        return res.status(400).json({ message: "Charity name cannot be empty" });
      }
      
      const user = await storage.updateUserCharityName(id, charityName.trim());
      res.json({ message: "Charity name updated", user });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating charity name: " + error.message });
    }
  });

  app.patch("/api/user/:id/ai-responses", async (req, res) => {
    try {
      const { id } = req.params;
      const { useAiResponses } = req.body;

      if (typeof useAiResponses !== 'boolean') {
        return res.status(400).json({ message: 'useAiResponses must be a boolean' });
      }

      const user = await storage.updateUserAiResponseSetting(id, useAiResponses);
      res.json({ message: "AI response setting updated", user });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating AI response setting: " + error.message });
    }
  });

  // Update user email interval (new route for dashboard)
  app.put("/api/user/:id/email-interval", async (req, res) => {
    try {
      const { id } = req.params;
      const { emailCheckInterval } = req.body;
      
      if (!emailCheckInterval || emailCheckInterval < 0.5 || emailCheckInterval > 60) {
        return res.status(400).json({ message: "Interval must be between 0.5 and 60 minutes" });
      }
      
      const user = await storage.updateUserEmailCheckInterval(id, emailCheckInterval);
      res.json({ message: "Email check interval updated", user });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating email check interval: " + error.message });
    }
  });

  // Update charity name (new route for dashboard)
  app.put("/api/user/:id/charity-name", async (req, res) => {
    try {
      const { id } = req.params;
      const { charityName } = req.body;
      
      if (!charityName || charityName.trim().length === 0) {
        return res.status(400).json({ message: "Charity name cannot be empty" });
      }
      
      const user = await storage.updateUserCharityName(id, charityName.trim());
      res.json({ message: "Charity name updated", user });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating charity name: " + error.message });
    }
  });

  // Manual sync endpoint  
  app.post("/api/manual-sync", async (req, res) => {
    try {
      // For now, we'll just trigger processing for all users
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        if (user.gmailToken) {
          try {
            const { EmailProcessor } = await import('./services/email-processor');
            const emailProcessor = new EmailProcessor();
            await emailProcessor.processNewEmails(user);
            
            // Update last check time
            await storage.updateUserLastEmailCheck(user.id, new Date());
          } catch (error: any) {
            console.error(`Error processing emails for user ${user.id}:`, error.message);
          }
        }
      }
      
      res.json({ message: "Manual sync initiated for all users" });
    } catch (error: any) {
      res.status(500).json({ message: "Error during manual sync: " + error.message });
    }
  });

  // Gmail OAuth routes
  app.get("/api/auth/gmail", async (req, res) => {
    try {
      const authUrl = gmailService.getAuthUrl();
      res.json({ authUrl });
    } catch (error: any) {
      res.status(500).json({ message: "Error generating auth URL: " + error.message });
    }
  });

  // Gmail revoke access
  app.post("/api/auth/gmail/revoke", async (req, res) => {
    try {
      console.log('Gmail revoke request received:', req.body);
      const { userId } = req.body;
      
      if (!userId) {
        console.error('No userId provided in revoke request');
        return res.status(400).json({ message: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.error('User not found:', userId);
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.gmailRefreshToken) {
        console.log('No Gmail refresh token found for user:', userId);
        return res.status(400).json({ message: "No Gmail tokens to revoke" });
      }

      // Revoke the refresh token with Google
      try {
        console.log('Attempting to revoke tokens with Google...');
        await gmailService.revokeTokens(user.gmailRefreshToken);
        console.log('Google token revocation successful');
      } catch (error: any) {
        console.error('Google token revocation failed:', error.message);
        // Continue anyway to clear local tokens
      }

      // Clear Gmail tokens from database
      console.log('Clearing Gmail tokens from database...');
      await storage.updateUserGmailTokens(userId, "", "");
      console.log('Gmail tokens cleared from database');

      res.json({ message: "Gmail access revoked successfully" });
    } catch (error: any) {
      console.error('Error in Gmail revoke endpoint:', error);
      res.status(500).json({ message: "Error revoking Gmail access: " + error.message });
    }
  });

  app.post("/api/auth/gmail/callback", async (req, res) => {
    try {
      console.log('Gmail OAuth callback received:', req.body);
      const { code, email } = req.body;
      
      if (!code || !email) {
        console.log('Missing code or email in callback');
        return res.status(400).json({ message: "Code and email are required" });
      }

      console.log('Getting tokens from Gmail...');
      const tokens = await gmailService.getTokens(code);
      console.log('Tokens received:', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token });
      
      // Create or update user
      console.log('Looking for existing user with email:', email);
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.log('Creating new user...');
        user = await storage.createUser({ email });
        console.log('User created:', user.id);
      } else {
        console.log('Found existing user:', user.id);
      }

      if (tokens.access_token && tokens.refresh_token) {
        console.log('Updating user Gmail tokens...');
        user = await storage.updateUserGmailTokens(user.id, tokens.access_token, tokens.refresh_token);
        console.log('Tokens updated successfully');
      }

      // Create Gmail labels
      if (tokens.access_token) {
        console.log('Creating Gmail labels...');
        await gmailService.createLabels(tokens.access_token);
        console.log('Labels created successfully');
      }

      res.json({ user, tokens });
    } catch (error: any) {
      console.error('Gmail callback error:', error);
      res.status(500).json({ message: "Error handling Gmail callback: " + error.message });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const stats = await storage.getDashboardStats(userId as string);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching dashboard stats: " + error.message });
    }
  });

  // Contacts management
  app.get("/api/contacts", async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const contacts = await storage.getContacts(userId as string);
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching contacts: " + error.message });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(validatedData);
      res.json(contact);
    } catch (error: any) {
      res.status(400).json({ message: "Error creating contact: " + error.message });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteContact(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Error deleting contact: " + error.message });
    }
  });

  // Pending emails
  app.get("/api/pending-emails", async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const pendingEmails = await storage.getPendingEmails(userId as string);
      res.json(pendingEmails);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching pending emails: " + error.message });
    }
  });

  // Donations
  app.get("/api/donations", async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const donations = await storage.getDonations(userId as string);
      res.json(donations);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching donations: " + error.message });
    }
  });

  app.get("/api/donations/recent", async (req, res) => {
    try {
      const { userId, limit } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const donations = await storage.getRecentDonations(
        userId as string, 
        limit ? parseInt(limit as string) : undefined
      );
      res.json(donations);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching recent donations: " + error.message });
    }
  });

  // Email processing
  app.post("/api/process-emails", async (req, res) => {
    try {
      console.log('Email processing request received:', req.body);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.gmailToken) {
        return res.status(404).json({ message: "User not found or Gmail not connected" });
      }

      // Import EmailProcessor dynamically to avoid circular dependencies
      const { EmailProcessor } = await import('./services/email-processor');
      const emailProcessor = new EmailProcessor();
      
      console.log('Starting email processing for user:', user.email);
      await emailProcessor.processNewEmails(user);
      console.log('Email processing completed');
      
      res.json({ success: true, message: "Email processing completed" });
    } catch (error: any) {
      res.status(500).json({ message: "Error processing emails: " + error.message });
    }
  });

  // Stripe payment endpoints
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment service not configured" });
      }

      const { amount, senderEmail, pendingEmailId } = req.body;
      
      if (!amount || !senderEmail) {
        return res.status(400).json({ message: "Amount and sender email are required" });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          senderEmail,
          pendingEmailId: pendingEmailId || '',
          type: 'email_access_donation'
        }
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post("/api/create-payment-link", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment service not configured" });
      }

      const { amount, senderEmail, pendingEmailId, userId } = req.body;
      
      if (!amount || !senderEmail || !pendingEmailId || !userId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Create a payment link for the donation
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Email Access Donation',
                description: `Access donation from ${senderEmail}`,
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        payment_method_types: ['card'], // Explicitly specify card payments
        metadata: {
          senderEmail,
          pendingEmailId,
          userId,
          type: 'email_access_donation'
        }
      });

      res.json({ 
        paymentUrl: paymentLink.url,
        paymentLinkId: paymentLink.id 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment linkkkkk: " + error.message });
    }
  });

  // Create dynamic payment link for sender to access user's inbox
  app.post("/api/create-dynamic-payment-link", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment service not configured" });
      }

      const { targetEmail, senderEmail, charityName, amount = 1.00 } = req.body;
      
      if (!targetEmail || !senderEmail) {
        return res.status(400).json({ message: "Target email and sender email are required" });
      }

      // Find the target user
      const targetUser = await storage.getUserByEmail(targetEmail);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create Stripe payment link
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Email Access to ${targetEmail}`,
                description: `Donation to ${charityName || targetUser.charityName || 'Email Guardian'} for inbox access`,
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        metadata: {
          targetEmail,
          senderEmail,
          userId: targetUser.id,
          type: 'inbox_access'
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${process.env.VITE_APP_URL || 'https://emailguardian.com'}/payment-success?sender=${encodeURIComponent(senderEmail)}&target=${encodeURIComponent(targetEmail)}`
          }
        },
      });

      // Store payment intention
      await storage.createPaymentIntention({
        userId: targetUser.id,
        senderEmail,
        targetEmail,
        stripePaymentLinkId: paymentLink.id,
        amount: amount.toString(),
        status: 'pending',
        metadata: { charityName: charityName || targetUser.charityName }
      });

      res.json({ 
        paymentLink: paymentLink.url,
        paymentLinkId: paymentLink.id 
      });
    } catch (error: any) {
      console.error('Error creating dynamic payment linkkk:', error);
      res.status(500).json({ message: "Error creating payment link: " + error.message });
    }
  });

  // Webhook event logger for debugging
  app.post("/api/webhooks/stripe-debug", async (req, res) => {
    console.log('\n=== STRIPE WEBHOOK DEBUG ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('=== END WEBHOOK DEBUG ===\n');
    res.json({ received: true, debug: true });
  });

  // Stripe webhooks for payment completion
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // For testing, accept any webhook without verification
      // In production, you should verify with your webhook secret
      event = req.body;
    } catch (err: any) {
      console.log('Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Enhanced logging for all webhook events
    console.log('\n=== STRIPE WEBHOOK RECEIVED ===');
    console.log(`Event Type: ${event.type}`);
    console.log(`Event ID: ${event.id}`);
    console.log(`Event Data:`, JSON.stringify(event.data, null, 2));
    console.log('=== END WEBHOOK DATA ===\n');
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment Intent succeeded:', paymentIntent.id, paymentIntent.metadata);
        if (paymentIntent.metadata?.type === 'email_access_donation') {
          await handlePaymentSuccess(paymentIntent.metadata);
        } else if (paymentIntent.metadata?.type === 'inbox_access') {
          await handleDynamicPaymentSuccess(paymentIntent.metadata, paymentIntent.id);
        } else {
          // Try to handle payment without metadata by checking if it's from a payment link
          console.log('Payment Intent without inbox_access metadata, checking for payment link association');
          await handleDynamicPaymentSuccess({}, paymentIntent.id);
        }
        break;
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Checkout session completed:', session.id, session.metadata);
        if (session.metadata?.type === 'email_access_donation') {
          await handlePaymentSuccess(session.metadata);
        } else if (session.metadata?.type === 'inbox_access') {
          await handleDynamicPaymentSuccess(session.metadata, session.id);
        } else {
          // Try to handle session without metadata
          console.log('Checkout session without inbox_access metadata, checking for payment link association');
          await handleDynamicPaymentSuccess({}, session.id);
        }
        break;
      case 'payment_link.payment_intent.succeeded':
        const linkPaymentIntent = event.data.object;
        console.log('Payment Link Payment Intent succeeded:', linkPaymentIntent.id, linkPaymentIntent.metadata);
        if (linkPaymentIntent.metadata?.type === 'inbox_access') {
          await handleDynamicPaymentSuccess(linkPaymentIntent.metadata, linkPaymentIntent.id);
        } else {
          // Handle payment link payment without metadata
          await handleDynamicPaymentSuccess({}, linkPaymentIntent.id);
        }
        break;
      default:
        console.log(`Unhandled event type ${event.type}`, event.data?.object?.id || 'no ID');
    }

    res.json({ received: true });
  });

  async function handlePaymentSuccess(metadata: any) {
    try {
      const { senderEmail, pendingEmailId, userId } = metadata;
      
      if (!senderEmail || !userId) {
        console.log('Missing metadata for payment success');
        return;
      }

      console.log(`Payment successful for ${senderEmail}, processing access...`);
      
      // Import EmailProcessor to avoid circular dependencies
      const { EmailProcessor } = await import('./services/email-processor');
      const emailProcessor = new EmailProcessor();
      
      // Process the donation completion
      await emailProcessor.processDonationComplete(senderEmail, userId);
      
      console.log(`Email access granted to ${senderEmail}`);
    } catch (error: any) {
      console.error('Error handling payment success:', error.message);
    }
  }

  async function handleDynamicPaymentSuccess(metadata: any, sessionId: string, paymentLinkId?: string) {
    try {
      let { senderEmail, targetEmail, userId } = metadata;
      
      // If metadata is missing, try to find the payment intention by payment link ID or session ID
      if (!senderEmail || !targetEmail || !userId) {
        console.log('Missing metadata, attempting to find payment intention...', { paymentLinkId, sessionId });
        
        // Try to find by payment link ID first
        if (paymentLinkId) {
          const intention = await storage.getPaymentIntentionByStripeLink(paymentLinkId);
          if (intention) {
            senderEmail = intention.senderEmail;
            targetEmail = intention.targetEmail;
            userId = intention.userId;
            console.log(`Found payment intention by link ID: ${senderEmail} -> ${targetEmail}`);
          }
        }
        
        // If still missing, try to find most recent pending intention (fallback)
        if (!senderEmail && sessionId) {
          const allUsers = await storage.getAllUsers();
          for (const user of allUsers) {
            const intentions = await storage.getPaymentIntentionsBySender('', user.email);
            const pendingIntentions = intentions.filter(i => i.status === 'pending');
            if (pendingIntentions.length > 0) {
              const mostRecent = pendingIntentions.sort((a, b) => 
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
              )[0];
              senderEmail = mostRecent.senderEmail;
              targetEmail = mostRecent.targetEmail;
              userId = mostRecent.userId;
              console.log(`Found most recent pending intention: ${senderEmail} -> ${targetEmail}`);
              break;
            }
          }
        }
      }
      
      if (!senderEmail || !targetEmail || !userId) {
        console.log('Missing required data for dynamic payment success:', { senderEmail, targetEmail, userId, sessionId, paymentLinkId });
        return;
      }

      console.log(`Dynamic payment successful for ${senderEmail} to access ${targetEmail}`);
      
      // Update payment intention status
      const intentions = await storage.getPaymentIntentionsBySender(senderEmail, targetEmail);
      if (intentions.length > 0) {
        await storage.updatePaymentIntentionStatus(intentions[0].id, 'paid', sessionId);
      }
      
      // Create donation record for dashboard tracking
      try {
        await storage.createDonation({
          userId,
          amount: "1.00", // $1 donation
          senderEmail,
          status: "completed",
          stripeSessionId: sessionId
        });
        console.log(`Created donation record for ${senderEmail} payment to ${targetEmail}`);
      } catch (donationError: any) {
        console.error(`Failed to create donation record: ${donationError.message}`);
        // Continue with contact creation even if donation fails
      }
      
      // Automatically whitelist the sender
      const existingContact = await storage.getContactByEmail(userId, senderEmail);
      if (!existingContact) {
        await storage.createContact({
          userId,
          email: senderEmail,
          name: senderEmail.split('@')[0], // Use email prefix as name
          isWhitelisted: true
        });
        console.log(`Added ${senderEmail} to whitelist for ${targetEmail}`);
      } else {
        // Update existing contact to be whitelisted
        if (!existingContact.isWhitelisted) {
          await storage.updateContact(existingContact.id, { isWhitelisted: true });
          console.log(`Updated ${senderEmail} to whitelisted status for ${targetEmail}`);
        }
      }
      
      // Import EmailProcessor to process any pending emails
      const { EmailProcessor } = await import('./services/email-processor');
      const emailProcessor = new EmailProcessor();
      
      // Process any pending emails from this sender (this will mark them as "paid")
      await emailProcessor.processDonationComplete(senderEmail, userId);
      
      // Update email stats to reflect successful payment
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const stats = await storage.getEmailStats(userId, today);
      const currentReceived = stats ? parseInt(stats.donationsReceived || "0") : 0;
      
      await storage.createOrUpdateEmailStats(userId, today, {
        donationsReceived: (currentReceived + 1).toString()
      });
      
      console.log(`Dynamic email access granted to ${senderEmail} for ${targetEmail}`);
    } catch (error: any) {
      console.error('Error handling dynamic payment success:', error.message);
    }
  }

  // Manual webhook trigger for testing
  app.post("/api/test-webhook", async (req, res) => {
    try {
      const { senderEmail, targetEmail } = req.body;
      
      if (!senderEmail || !targetEmail) {
        return res.status(400).json({ message: "senderEmail and targetEmail are required" });
      }

      const targetUser = await storage.getUserByEmail(targetEmail);
      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" });
      }

      console.log(`Manual webhook trigger: ${senderEmail} -> ${targetEmail}`);
      
      await handleDynamicPaymentSuccess({
        senderEmail,
        targetEmail,
        userId: targetUser.id,
        type: 'inbox_access'
      }, `manual_${Date.now()}`);

      res.json({ 
        message: `Manual payment processing completed for ${senderEmail} -> ${targetEmail}`,
        success: true 
      });
    } catch (error: any) {
      console.error('Error in manual webhook trigger:', error);
      res.status(500).json({ message: "Error processing manual webhook: " + error.message });
    }
  });

  // Utility endpoint to update pending email statuses for paid contacts
  app.post("/api/update-paid-statuses", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Get all contacts that are whitelisted
      const contacts = await storage.getContacts(userId);
      const whitelistedContacts = contacts.filter(contact => contact.isWhitelisted);
      
      // Get all pending emails
      const pendingEmails = await storage.getPendingEmails(userId);
      
      let updatedCount = 0;
      
      // Update status to "paid" for all emails from whitelisted contacts
      for (const contact of whitelistedContacts) {
        const contactEmails = pendingEmails.filter(email => 
          email.sender === contact.email && email.status !== 'paid'
        );
        
        for (const email of contactEmails) {
          await storage.updatePendingEmailStatus(email.id, "paid");
          updatedCount++;
          console.log(`Updated email ${email.id} from ${contact.email} to paid status`);
        }
      }

      res.json({ 
        message: `Updated ${updatedCount} emails to paid status`,
        updatedCount,
        whitelistedContacts: whitelistedContacts.length
      });
    } catch (error: any) {
      console.error('Error updating paid statuses:', error);
      res.status(500).json({ message: "Error updating statuses: " + error.message });
    }
  });

  // Cleanup endpoint for removing duplicate auto-reply emails
  app.post("/api/cleanup-duplicate-emails", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.gmailToken) {
        return res.json({ message: "User not found or Gmail not connected", cleaned: 0 });
      }

      // Get all pending emails for this user
      const pendingEmails = await storage.getPendingEmails(userId);
      
      // Find duplicate auto-reply emails (ones with "- Email Access Request" in subject)
      const autoReplyEmails = pendingEmails.filter(email => 
        email.subject?.includes('- Email Access Request') || 
        email.subject?.includes('Re: Re:') ||
        email.sender === user.email
      );

      console.log(`Found ${autoReplyEmails.length} duplicate auto-reply emails to clean up`);

      // Remove duplicate auto-reply emails from Gmail and database
      for (const email of autoReplyEmails) {
        try {
          // Try to remove from Gmail (moving to trash)
          await gmailService.removeFromInbox(user.gmailToken!, email.gmailMessageId);
        } catch (error) {
          // Continue even if Gmail removal fails
          console.log(`Failed to remove Gmail message ${email.gmailMessageId}, continuing...`);
        }
        
        // Delete from database
        await storage.deletePendingEmail(email.id);
      }

      res.json({ 
        message: `Cleaned up ${autoReplyEmails.length} duplicate auto-reply emails`,
        cleaned: autoReplyEmails.length 
      });
    } catch (error: any) {
      console.error('Cleanup error:', error);
      res.status(500).json({ message: "Error cleaning up emails: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
