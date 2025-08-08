-- Fix donations table by adding all missing columns
-- Run this script manually in your database

-- Add charity_id column to donations table
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "charity_id" varchar REFERENCES "charities"("id");

-- Add stripe_transfer_id column to donations table
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "stripe_transfer_id" text;

-- Add paid_out_at column to donations table
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "paid_out_at" timestamp;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "donations_charity_id_idx" ON "donations"("charity_id");
CREATE INDEX IF NOT EXISTS "donations_stripe_transfer_id_idx" ON "donations"("stripe_transfer_id");

-- Add comments to explain the fields
COMMENT ON COLUMN "donations"."charity_id" IS 'Reference to the charity that will receive this donation';
COMMENT ON COLUMN "donations"."stripe_transfer_id" IS 'For tracking payouts to charities';
COMMENT ON COLUMN "donations"."paid_out_at" IS 'When donation was transferred to charity';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'donations' AND column_name IN ('charity_id', 'stripe_transfer_id', 'paid_out_at')
ORDER BY column_name;
