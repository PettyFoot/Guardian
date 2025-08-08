-- Add payouts table
CREATE TABLE IF NOT EXISTS "payouts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "charity_id" varchar NOT NULL REFERENCES "charities"("id"),
  "charity_name" text NOT NULL,
  "stripe_transfer_id" text NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "platform_fee" decimal(10,2) NOT NULL,
  "total_donations" decimal(10,2) NOT NULL,
  "donation_count" decimal(10,0) NOT NULL,
  "status" text NOT NULL DEFAULT 'completed',
  "error_message" text,
  "processed_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "payouts_charity_id_idx" ON "payouts"("charity_id");
CREATE INDEX IF NOT EXISTS "payouts_stripe_transfer_id_idx" ON "payouts"("stripe_transfer_id");
CREATE INDEX IF NOT EXISTS "payouts_created_at_idx" ON "payouts"("created_at");
