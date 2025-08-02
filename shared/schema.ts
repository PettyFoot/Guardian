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
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  isWhitelisted: boolean("is_whitelisted").default(true),
  addedAt: timestamp("added_at").defaultNow(),
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
});

export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pendingEmailId: varchar("pending_email_id").references(() => pendingEmails.id, { onDelete: "cascade" }),
  stripeSessionId: text("stripe_session_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  senderEmail: text("sender_email").notNull(),
  status: text("status").notNull().default("completed"), // completed, refunded
  paidAt: timestamp("paid_at").defaultNow(),
});

export const emailStats = pgTable("email_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  emailsFiltered: decimal("emails_filtered", { precision: 10, scale: 0 }).default("0"),
  donationsReceived: decimal("donations_received", { precision: 10, scale: 2 }).default("0.00"),
  pendingDonations: decimal("pending_donations", { precision: 10, scale: 0 }).default("0"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  contacts: many(contacts),
  pendingEmails: many(pendingEmails),
  donations: many(donations),
  emailStats: many(emailStats),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  addedAt: true,
});

export const insertPendingEmailSchema = createInsertSchema(pendingEmails).omit({
  id: true,
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  paidAt: true,
});

export const insertEmailStatsSchema = createInsertSchema(emailStats).omit({
  id: true,
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
