import {
  users, contacts, pendingEmails, donations, emailStats, paymentIntentions,
  type User, type InsertUser,
  type Contact, type InsertContact,
  type PendingEmail, type InsertPendingEmail,
  type Donation, type InsertDonation,
  type EmailStats, type InsertEmailStats,
  type PaymentIntention, type InsertPaymentIntention,
  charities, type InsertCharity,
  payouts, type InsertPayout, type Payout
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

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
  updateUserCharityName(id: string, charityName: string): Promise<User>;
  updateUserCharity(userId: string, charityId: string): Promise<User>;
  updateUserAiResponseSetting(id: string, useAiResponses: boolean): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Contact methods
  getContacts(userId: string): Promise<Contact[]>;
  getContactByEmail(userId: string, email: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
  isEmailWhitelisted(userId: string, email: string): Promise<boolean>;

  // Pending email methods
  getPendingEmails(userId: string): Promise<PendingEmail[]>;
  createPendingEmail(email: InsertPendingEmail): Promise<PendingEmail>;
  updatePendingEmailStatus(id: string, status: string): Promise<PendingEmail>;
  updatePendingEmailDonationLink(id: string, donationLinkId: string): Promise<PendingEmail>;
  getPendingEmailByGmailId(userId: string, gmailMessageId: string): Promise<PendingEmail | undefined>;
  deletePendingEmail(id: string): Promise<void>;

  // Donation methods
  getDonations(userId: string): Promise<Donation[]>;
  getRecentDonations(userId: string, limit?: number): Promise<Donation[]>;
  createDonation(donation: InsertDonation): Promise<Donation>;
  getDonationByStripeSession(sessionId: string): Promise<Donation | undefined>;
  getDonationsForPayout(charityId: string): Promise<Donation[]>;
  updateDonationPayout(donationId: string, transferId: string): Promise<Donation>;

  // Stats methods
  getEmailStats(userId: string, date: Date): Promise<EmailStats | undefined>;
  createOrUpdateEmailStats(userId: string, date: Date, stats: Partial<EmailStats>): Promise<EmailStats>;
  getDashboardStats(userId: string): Promise<{
    emailsFiltered: number;
    emailsFilteredYesterday: number;
    pendingDonations: number;
    pendingDonationsRevenue: number;
    donationsReceived: number;
    donationsCount: number;
    knownContacts: number;
    contactsAddedThisWeek: number;
  }>;

  // Payment intention methods
  createPaymentIntention(intention: InsertPaymentIntention): Promise<PaymentIntention>;
  getPaymentIntentionByStripeLink(linkId: string): Promise<PaymentIntention | undefined>;
  updatePaymentIntentionStatus(id: string, status: string, sessionId?: string): Promise<PaymentIntention>;
  getPaymentIntentionsBySender(senderEmail: string, targetEmail: string): Promise<PaymentIntention[]>;

  // Charity methods
  createCharity(data: InsertCharity): Promise<InsertCharity>;
  getCharity(id: string): Promise<InsertCharity | undefined>;
  getAllCharities(): Promise<InsertCharity[]>;
  updateCharityStripeAccount(id: string, stripeAccountId: string, onboardingComplete?: boolean): Promise<InsertCharity>;
  updateCharityPayoutFrequency(id: string, frequency: string): Promise<InsertCharity>;
  getCharitiesForPayout(): Promise<InsertCharity[]>;
  updateCharityPayout(id: string, amount: string): Promise<InsertCharity>;

  // Payout methods
  createPayout(data: InsertPayout): Promise<Payout>;
  getAllPayouts(): Promise<Payout[]>;
  getPayoutsByCharity(charityId: string): Promise<Payout[]>;
  getPayoutsByDateRange(startDate: Date, endDate: Date): Promise<Payout[]>;
  getPayoutByStripeTransfer(transferId: string): Promise<Payout | undefined>;
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
      .set({ gmailToken: token, gmailRefreshToken: refreshToken, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeCustomerId(id: string, customerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserLastEmailCheck(id: string, lastCheck: Date): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ lastEmailCheck: lastCheck, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserEmailCheckInterval(id: string, intervalMinutes: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ emailCheckInterval: intervalMinutes.toString(), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserCharityName(id: string, charityName: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ charityName, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserAiResponseSetting(id: string, useAiResponses: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ useAiResponses, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserCharity(userId: string, charityId: string): Promise<User> {
    const [result] = await db
      .update(users)
      .set({
        charityId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result;
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

  async updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact> {
    const [updatedContact] = await db
      .update(contacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact;
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
      .set({ status, updatedAt: new Date() })
      .where(eq(pendingEmails.id, id))
      .returning();
    return updatedEmail;
  }

  async updatePendingEmailDonationLink(id: string, donationLinkId: string): Promise<PendingEmail> {
    const [updatedEmail] = await db
      .update(pendingEmails)
      .set({ donationLinkId, status: "donation_sent", updatedAt: new Date() })
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

  async deletePendingEmail(id: string): Promise<void> {
    await db.delete(pendingEmails).where(eq(pendingEmails.id, id));
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

  async createDonation(data: InsertDonation): Promise<Donation> {
    const [result] = await db
      .insert(donations)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Update charity total received
    if (data.charityId && data.amount) {
      await db.update(charities)
        .set({
          totalReceived: sql`${charities.totalReceived} + ${data.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(charities.id, data.charityId));
    }

    return result;
  }

  async getDonationByStripeSession(sessionId: string): Promise<Donation | undefined> {
    const [donation] = await db
      .select()
      .from(donations)
      .where(eq(donations.stripeSessionId, sessionId));
    return donation || undefined;
  }

  async getDonationsForPayout(charityId: string): Promise<Donation[]> {
    return await db.select()
      .from(donations)
      .where(
        and(
          eq(donations.charityId, charityId),
          eq(donations.status, 'completed')
        )
      );
  }

  async updateDonationPayout(donationId: string, transferId: string): Promise<Donation> {
    const [result] = await db.update(donations)
      .set({
        status: 'paid_out',
        stripeTransferId: transferId,
        paidOutAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(donations.id, donationId))
      .returning();
    return result;
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
        .set({ ...stats, updatedAt: new Date() })
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
    emailsFilteredYesterday: number;
    pendingDonations: number;
    pendingDonationsRevenue: number;
    donationsReceived: number;
    donationsCount: number;
    knownContacts: number;
    contactsAddedThisWeek: number;
  }> {
    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get yesterday's stats
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get week start (7 days ago)
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const todayStats = await this.getEmailStats(userId, today);
    const yesterdayStats = await this.getEmailStats(userId, yesterday);

    // Get all pending emails (not just count)
    const pendingEmailsList = await db
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

    // Get contacts added this week
    const recentContacts = await db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.userId, userId),
        sql`${contacts.createdAt} >= ${weekStart}`
      ));

    const totalDonationAmount = totalDonations.reduce((sum, donation) =>
      sum + parseFloat(donation.amount), 0);

    return {
      emailsFiltered: todayStats ? parseInt(todayStats.emailsFiltered || "0") : 0,
      emailsFilteredYesterday: yesterdayStats ? parseInt(yesterdayStats.emailsFiltered || "0") : 0,
      pendingDonations: pendingEmailsList.length,
      pendingDonationsRevenue: pendingEmailsList.length * 1.0, // $1 per pending donation
      donationsReceived: totalDonationAmount,
      donationsCount: totalDonations.length,
      knownContacts: contactCount.length,
      contactsAddedThisWeek: recentContacts.length,
    };
  }

  // Payment intention methods
  async createPaymentIntention(data: InsertPaymentIntention): Promise<PaymentIntention> {
    const [created] = await db
      .insert(paymentIntentions)
      .values(data)
      .returning();
    return created;
  }

  async getPaymentIntentionByStripeLink(linkId: string): Promise<PaymentIntention | undefined> {
    const [intention] = await db
      .select()
      .from(paymentIntentions)
      .where(eq(paymentIntentions.stripePaymentLinkId, linkId));
    return intention || undefined;
  }

  async updatePaymentIntentionStatus(id: string, status: string, sessionId?: string): Promise<PaymentIntention> {
    const updateData: any = { status };
    if (sessionId) {
      updateData.stripeSessionId = sessionId;
    }
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    const [updated] = await db
      .update(paymentIntentions)
      .set(updateData)
      .where(eq(paymentIntentions.id, id))
      .returning();
    return updated;
  }

  async getPaymentIntentionsBySender(senderEmail: string, targetEmail: string): Promise<PaymentIntention[]> {
    return await db
      .select()
      .from(paymentIntentions)
      .where(and(
        eq(paymentIntentions.senderEmail, senderEmail),
        eq(paymentIntentions.targetEmail, targetEmail)
      ))
      .orderBy(desc(paymentIntentions.createdAt));
  }

  // Charity methods
  async createCharity(data: InsertCharity): Promise<InsertCharity> {
    const [result] = await db.insert(charities).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result;
  }

  async getCharity(id: string): Promise<InsertCharity | undefined> {
    const [result] = await db.select()
      .from(charities)
      .where(eq(charities.id, id));
    return result;
  }

  async getAllCharities(): Promise<InsertCharity[]> {
    return await db.select()
      .from(charities)
      .where(eq(charities.isActive, true))
      .orderBy(charities.name);
  }

  async updateCharityStripeAccount(id: string, stripeAccountId: string, onboardingComplete: boolean = false): Promise<InsertCharity> {
    const [result] = await db.update(charities)
      .set({
        stripeConnectAccountId: stripeAccountId,
        stripeOnboardingComplete: onboardingComplete,
        updatedAt: new Date(),
      })
      .where(eq(charities.id, id))
      .returning();
    return result;
  }

  async updateCharityPayoutFrequency(id: string, frequency: string): Promise<InsertCharity> {
    const [result] = await db.update(charities)
      .set({
        payoutFrequency: frequency,
        updatedAt: new Date(),
      })
      .where(eq(charities.id, id))
      .returning();
    return result;
  }

  async getCharityByStripeAccount(stripeAccountId: string): Promise<InsertCharity | undefined> {
    const [result] = await db.select()
      .from(charities)
      .where(eq(charities.stripeConnectAccountId, stripeAccountId));
    return result;
  }

  async getCharitiesForPayout(): Promise<InsertCharity[]> {
    return await db.select()
      .from(charities)
      .where(
        and(
          eq(charities.isActive, true),
          eq(charities.stripeOnboardingComplete, true)
        )
      );
  }

  async updateCharityPayout(id: string, amount: string): Promise<InsertCharity> {
    const [result] = await db.update(charities)
      .set({
        totalPaidOut: sql`${charities.totalPaidOut} + ${amount}`,
        lastPayoutDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(charities.id, id))
      .returning();
    return result;
  }

  // Payout methods
  async createPayout(data: InsertPayout): Promise<Payout> {
    const [result] = await db.insert(payouts).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result;
  }

  async getAllPayouts(): Promise<Payout[]> {
    return await db.select()
      .from(payouts)
      .orderBy(desc(payouts.createdAt));
  }

  async getPayoutsByCharity(charityId: string): Promise<Payout[]> {
    return await db.select()
      .from(payouts)
      .where(eq(payouts.charityId, charityId))
      .orderBy(desc(payouts.createdAt));
  }

  async getPayoutsByDateRange(startDate: Date, endDate: Date): Promise<Payout[]> {
    return await db.select()
      .from(payouts)
      .where(and(
        gte(payouts.createdAt, startDate),
        lte(payouts.createdAt, endDate)
      ))
      .orderBy(desc(payouts.createdAt));
  }

  async getPayoutByStripeTransfer(transferId: string): Promise<Payout | undefined> {
    const [result] = await db.select()
      .from(payouts)
      .where(eq(payouts.stripeTransferId, transferId));
    return result;
  }
}

export const storage = new DatabaseStorage();