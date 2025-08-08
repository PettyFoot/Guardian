-- Add paymentIntentions table
CREATE TABLE IF NOT EXISTS "payment_intentions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sender_email" text NOT NULL,
  "target_email" text NOT NULL,
  "stripe_payment_link_id" text NOT NULL,
  "stripe_session_id" text,
  "amount" decimal(10,2) DEFAULT '1.00',
  "status" text NOT NULL DEFAULT 'pending',
  "metadata" json,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "paid_at" timestamp
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "payment_intentions_user_id_idx" ON "payment_intentions"("user_id");
CREATE INDEX IF NOT EXISTS "payment_intentions_sender_email_idx" ON "payment_intentions"("sender_email");
CREATE INDEX IF NOT EXISTS "payment_intentions_target_email_idx" ON "payment_intentions"("target_email");
CREATE INDEX IF NOT EXISTS "payment_intentions_stripe_payment_link_id_idx" ON "payment_intentions"("stripe_payment_link_id");
CREATE INDEX IF NOT EXISTS "payment_intentions_status_idx" ON "payment_intentions"("status");
CREATE INDEX IF NOT EXISTS "payment_intentions_sender_target_idx" ON "payment_intentions"("sender_email", "target_email");

-- Add comment to explain the table
COMMENT ON TABLE "payment_intentions" IS 'Tracks payment intentions for email access donations';
