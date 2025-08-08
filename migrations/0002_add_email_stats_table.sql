-- Add emailStats table
CREATE TABLE IF NOT EXISTS "email_stats" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" timestamp NOT NULL,
  "emails_filtered" decimal(10,0) DEFAULT '0',
  "donations_received" decimal(10,2) DEFAULT '0.00',
  "pending_donations" decimal(10,0) DEFAULT '0',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "email_stats_user_id_idx" ON "email_stats"("user_id");
CREATE INDEX IF NOT EXISTS "email_stats_date_idx" ON "email_stats"("date");
CREATE INDEX IF NOT EXISTS "email_stats_user_date_idx" ON "email_stats"("user_id", "date");

-- Add comment to explain the table
COMMENT ON TABLE "email_stats" IS 'Daily email processing statistics for each user';
