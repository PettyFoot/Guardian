import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { gmailService } from "./services/gmail";
import { stripeService } from "./services/stripe";
import { emailProcessor } from "./services/email-processor";
import { insertUserSchema, insertContactSchema } from "@shared/schema";

// Auto-processing scheduler
let processingInterval: NodeJS.Timeout | null = null;

async function startAutoProcessing() {
  if (processingInterval) return; // Already running
  
  processingInterval = setInterval(async () => {
    try {
      console.log('Auto-processing emails...');
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        if (user.gmailToken) {
          const { EmailProcessor } = await import('./services/email-processor');
          const emailProcessor = new EmailProcessor();
          await emailProcessor.processNewEmails(user);
        }
      }
    } catch (error: any) {
      console.error('Auto-processing error:', error.message);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes
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

  // Placeholder for future Stripe webhook (disabled for now)
  app.post("/api/webhooks/stripe", async (req, res) => {
    res.json({ message: "Stripe webhooks not configured yet" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
