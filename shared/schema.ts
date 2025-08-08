import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  gmailToken: text("gmail_token"),
  gmailRefreshToken: text("gmail_refresh_token"),
  stripeCustomerId: text("stripe_customer_id"),
  emailCheckInterval: decimal("email_check_interval", { precision: 5, scale: 1 }).default("1.0"), // in minutes
  lastEmailCheck: timestamp("last_email_check"),
  charityName: text("charity_name").default("Email Guardian"),
  charityId: varchar("charity_id").references(() => charities.id), // Reference to selected charity
  useAiResponses: boolean("use_ai_responses").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  isWhitelisted: boolean("is_whitelisted").default(true),
  addedAt: timestamp("added_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pendingEmails = pgTable("pending_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  gmailMessageId: text("gmail_message_id").notNull(),
  sender: text("sender").notNull(),
  subject: text("subject"),
  snippet: text("snippet"),
  receivedAt: timestamp("received_at").notNull(),
  status: text("status").notNull().default("pending"), // pending, donation_sent, paid, released
  donationLinkId: text("donation_link_id"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  charityId: varchar("charity_id").references(() => charities.id), // Which charity will receive this donation
  pendingEmailId: varchar("pending_email_id").references(() => pendingEmails.id, { onDelete: "cascade" }),
  stripeSessionId: text("stripe_session_id").notNull(),
  stripeTransferId: text("stripe_transfer_id"), // For tracking payouts to charities
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  senderEmail: text("sender_email").notNull(),
  status: text("status").notNull().default("completed"), // completed, refunded, paid_out
  paidAt: timestamp("paid_at").defaultNow(),
  paidOutAt: timestamp("paid_out_at"), // When donation was transferred to charity
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailStats = pgTable("email_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  emailsFiltered: decimal("emails_filtered", { precision: 10, scale: 0 }).default("0"),
  donationsReceived: decimal("donations_received", { precision: 10, scale: 2 }).default("0.00"),
  pendingDonations: decimal("pending_donations", { precision: 10, scale: 0 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const charities = pgTable("charities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  website: text("website"),
  contactEmail: text("contact_email").notNull(),
  contactName: text("contact_name").notNull(),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").default(false),
  isActive: boolean("is_active").default(true),
  payoutFrequency: text("payout_frequency").default("weekly"), // daily, weekly, monthly, minute
  lastPayoutDate: timestamp("last_payout_date"),
  totalReceived: decimal("total_received", { precision: 12, scale: 2 }).default("0.00"),
  totalPaidOut: decimal("total_paid_out", { precision: 12, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  charityId: varchar("charity_id").notNull().references(() => charities.id),
  charityName: text("charity_name").notNull(),
  stripeTransferId: text("stripe_transfer_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  totalDonations: decimal("total_donations", { precision: 10, scale: 2 }).notNull(),
  donationCount: decimal("donation_count", { precision: 10, scale: 0 }).notNull(),
  status: text("status").notNull().default("completed"), // completed, failed, pending
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentIntentions = pgTable("payment_intentions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderEmail: text("sender_email").notNull(),
  targetEmail: text("target_email").notNull(), // The user's email being contacted
  stripePaymentLinkId: text("stripe_payment_link_id").notNull(),
  stripeSessionId: text("stripe_session_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).default("1.00"),
  status: text("status").notNull().default("pending"), // pending, paid, cancelled
  metadata: json("metadata"), // Additional data like message context
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});

// Relations
export const charitiesRelations = relations(charities, ({ many }) => ({
  users: many(users),
  donations: many(donations),
  payouts: many(payouts),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  charity: one(charities, {
    fields: [users.charityId],
    references: [charities.id],
  }),
  contacts: many(contacts),
  pendingEmails: many(pendingEmails),
  donations: many(donations),
  emailStats: many(emailStats),
  paymentIntentions: many(paymentIntentions),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
  }),
}));

export const pendingEmailsRelations = relations(pendingEmails, ({ one }) => ({
  user: one(users, {
    fields: [pendingEmails.userId],
    references: [users.id],
  }),
  donation: one(donations),
}));

export const donationsRelations = relations(donations, ({ one }) => ({
  user: one(users, {
    fields: [donations.userId],
    references: [users.id],
  }),
  charity: one(charities, {
    fields: [donations.charityId],
    references: [charities.id],
  }),
  pendingEmail: one(pendingEmails, {
    fields: [donations.pendingEmailId],
    references: [pendingEmails.id],
  }),
}));

export const emailStatsRelations = relations(emailStats, ({ one }) => ({
  user: one(users, {
    fields: [emailStats.userId],
    references: [users.id],
  }),
}));

export const paymentIntentionsRelations = relations(paymentIntentions, ({ one }) => ({
  user: one(users, {
    fields: [paymentIntentions.userId],
    references: [users.id],
  }),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  charity: one(charities, {
    fields: [payouts.charityId],
    references: [charities.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  addedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPendingEmailSchema = createInsertSchema(pendingEmails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailStatsSchema = createInsertSchema(emailStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCharitySchema = createInsertSchema(charities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentIntentionSchema = createInsertSchema(paymentIntentions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  paidAt: true,
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type PendingEmail = typeof pendingEmails.$inferSelect;
export type InsertPendingEmail = z.infer<typeof insertPendingEmailSchema>;

export type Donation = typeof donations.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;

export type EmailStats = typeof emailStats.$inferSelect;
export type InsertEmailStats = z.infer<typeof insertEmailStatsSchema>;

export type Charity = typeof charities.$inferSelect;
export type InsertCharity = z.infer<typeof insertCharitySchema>;

export type PaymentIntention = typeof paymentIntentions.$inferSelect;
export type InsertPaymentIntention = z.infer<typeof insertPaymentIntentionSchema>;

export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
