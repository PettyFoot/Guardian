import { 
  users, contacts, pendingEmails, donations, emailStats,
  type User, type InsertUser,
  type Contact, type InsertContact,
  type PendingEmail, type InsertPendingEmail,
  type Donation, type InsertDonation,
  type EmailStats, type InsertEmailStats
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User methods
  getAllUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserGmailTokens(id: string, token: string, refreshToken: string): Promise<User>;
  updateUserStripeCustomerId(id: string, customerId: string): Promise<User>;
  updateUserLastEmailCheck(id: string, lastCheck: Date): Promise<User>;
  updateUserEmailCheckInterval(id: string, intervalMinutes: number): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Contact methods
  getContacts(userId: string): Promise<Contact[]>;
  getContactByEmail(userId: string, email: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
  isEmailWhitelisted(userId: string, email: string): Promise<boolean>;

  // Pending email methods
  getPendingEmails(userId: string): Promise<PendingEmail[]>;
  createPendingEmail(email: InsertPendingEmail): Promise<PendingEmail>;
  updatePendingEmailStatus(id: string, status: string): Promise<PendingEmail>;
  updatePendingEmailDonationLink(id: string, donationLinkId: string): Promise<PendingEmail>;
  getPendingEmailByGmailId(userId: string, gmailMessageId: string): Promise<PendingEmail | undefined>;

  // Donation methods
  getDonations(userId: string): Promise<Donation[]>;
  getRecentDonations(userId: string, limit?: number): Promise<Donation[]>;
  createDonation(donation: InsertDonation): Promise<Donation>;
  getDonationByStripeSession(sessionId: string): Promise<Donation | undefined>;

  // Stats methods
  getEmailStats(userId: string, date: Date): Promise<EmailStats | undefined>;
  createOrUpdateEmailStats(userId: string, date: Date, stats: Partial<EmailStats>): Promise<EmailStats>;
  getDashboardStats(userId: string): Promise<{
    emailsFiltered: number;
    pendingDonations: number;
    donationsReceived: number;
    knownContacts: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserGmailTokens(id: string, token: string, refreshToken: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ gmailToken: token, gmailRefreshToken: refreshToken })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeCustomerId(id: string, customerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserLastEmailCheck(id: string, lastCheck: Date): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ lastEmailCheck: lastCheck })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserEmailCheckInterval(id: string, intervalMinutes: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ emailCheckInterval: intervalMinutes.toString() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getContacts(userId: string): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.userId, userId));
  }

  async getContactByEmail(userId: string, email: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.email, email)));
    return contact || undefined;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db
      .insert(contacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async deleteContact(id: string): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  async isEmailWhitelisted(userId: string, email: string): Promise<boolean> {
    const contact = await this.getContactByEmail(userId, email);
    return contact?.isWhitelisted ?? false;
  }

  async getPendingEmails(userId: string): Promise<PendingEmail[]> {
    return await db
      .select()
      .from(pendingEmails)
      .where(eq(pendingEmails.userId, userId))
      .orderBy(desc(pendingEmails.receivedAt));
  }

  async createPendingEmail(email: InsertPendingEmail): Promise<PendingEmail> {
    const [newEmail] = await db
      .insert(pendingEmails)
      .values(email)
      .returning();
    return newEmail;
  }

  async updatePendingEmailStatus(id: string, status: string): Promise<PendingEmail> {
    const [updatedEmail] = await db
      .update(pendingEmails)
      .set({ status })
      .where(eq(pendingEmails.id, id))
      .returning();
    return updatedEmail;
  }

  async updatePendingEmailDonationLink(id: string, donationLinkId: string): Promise<PendingEmail> {
    const [updatedEmail] = await db
      .update(pendingEmails)
      .set({ donationLinkId, status: "donation_sent" })
      .where(eq(pendingEmails.id, id))
      .returning();
    return updatedEmail;
  }

  async getPendingEmailByGmailId(userId: string, gmailMessageId: string): Promise<PendingEmail | undefined> {
    const [email] = await db
      .select()
      .from(pendingEmails)
      .where(and(eq(pendingEmails.userId, userId), eq(pendingEmails.gmailMessageId, gmailMessageId)));
    return email || undefined;
  }

  async getDonations(userId: string): Promise<Donation[]> {
    return await db
      .select()
      .from(donations)
      .where(eq(donations.userId, userId))
      .orderBy(desc(donations.paidAt));
  }

  async getRecentDonations(userId: string, limit = 10): Promise<Donation[]> {
    return await db
      .select()
      .from(donations)
      .where(eq(donations.userId, userId))
      .orderBy(desc(donations.paidAt))
      .limit(limit);
  }

  async createDonation(donation: InsertDonation): Promise<Donation> {
    const [newDonation] = await db
      .insert(donations)
      .values(donation)
      .returning();
    return newDonation;
  }

  async getDonationByStripeSession(sessionId: string): Promise<Donation | undefined> {
    const [donation] = await db
      .select()
      .from(donations)
      .where(eq(donations.stripeSessionId, sessionId));
    return donation || undefined;
  }

  async getEmailStats(userId: string, date: Date): Promise<EmailStats | undefined> {
    const [stats] = await db
      .select()
      .from(emailStats)
      .where(and(eq(emailStats.userId, userId), eq(emailStats.date, date)));
    return stats || undefined;
  }

  async createOrUpdateEmailStats(userId: string, date: Date, stats: Partial<EmailStats>): Promise<EmailStats> {
    const existing = await this.getEmailStats(userId, date);
    
    if (existing) {
      const [updated] = await db
        .update(emailStats)
        .set(stats)
        .where(and(eq(emailStats.userId, userId), eq(emailStats.date, date)))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(emailStats)
        .values({ userId, date, ...stats })
        .returning();
      return created;
    }
  }

  async getDashboardStats(userId: string): Promise<{
    emailsFiltered: number;
    pendingDonations: number;
    donationsReceived: number;
    knownContacts: number;
  }> {
    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayStats = await this.getEmailStats(userId, today);
    const pendingCount = await db
      .select()
      .from(pendingEmails)
      .where(and(eq(pendingEmails.userId, userId), eq(pendingEmails.status, "pending")));

    const totalDonations = await db
      .select()
      .from(donations)
      .where(eq(donations.userId, userId));

    const contactCount = await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, userId));

    const totalDonationAmount = totalDonations.reduce((sum, donation) => 
      sum + parseFloat(donation.amount), 0);

    return {
      emailsFiltered: todayStats ? parseInt(todayStats.emailsFiltered || "0") : 0,
      pendingDonations: pendingCount.length,
      donationsReceived: totalDonationAmount,
      knownContacts: contactCount.length,
    };
  }
}

export const storage = new DatabaseStorage();
