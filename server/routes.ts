import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { gmailService } from "./services/gmail";
import { stripeService } from "./services/stripe";
import { emailProcessor } from "./services/email-processor";
import { insertUserSchema, insertContactSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
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

  // Gmail OAuth routes
  app.get("/api/auth/gmail", async (req, res) => {
    try {
      const authUrl = gmailService.getAuthUrl();
      res.json({ authUrl });
    } catch (error: any) {
      res.status(500).json({ message: "Error generating auth URL: " + error.message });
    }
  });

  app.post("/api/auth/gmail/callback", async (req, res) => {
    try {
      const { code, email } = req.body;
      
      if (!code || !email) {
        return res.status(400).json({ message: "Code and email are required" });
      }

      const tokens = await gmailService.getTokens(code);
      
      // Create or update user
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({ email });
      }

      if (tokens.access_token && tokens.refresh_token) {
        user = await storage.updateUserGmailTokens(user.id, tokens.access_token, tokens.refresh_token);
      }

      // Create Gmail labels
      if (tokens.access_token) {
        await gmailService.createLabels(tokens.access_token);
      }

      res.json({ user, tokens });
    } catch (error: any) {
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
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await emailProcessor.processNewEmails(user);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Error processing emails: " + error.message });
    }
  });

  // Stripe webhook
  app.post("/api/webhooks/stripe", async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;
    
    try {
      const event = await stripeService.constructEvent(req.body, signature);
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        await emailProcessor.processDonationComplete(session.id);
      }
      
      res.json({ received: true });
    } catch (error: any) {
      res.status(400).json({ message: "Webhook error: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
