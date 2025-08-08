-- Add customCharityData field to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "custom_charity_data" json;

-- Add comment to explain the field
COMMENT ON COLUMN "users"."custom_charity_data" IS 'JSON field for storing custom charity details when user selects custom charity instead of available ones';
