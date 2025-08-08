# Payout System Documentation

## Overview

The Email Guardian app now includes a comprehensive payout system that automatically distributes donations to charities based on configurable timeframes. This document outlines all the new features and how to use them.

## Current Payout Frequencies

The system now supports **4 payout frequencies**:

1. **Minute** - Payouts every 1 minute (NEW)
2. **Daily** - Payouts every 24 hours
3. **Weekly** - Payouts every 7 days
4. **Monthly** - Payouts every 30 days

## New Features Implemented

### 1. Payout Tracking Table

A new `payouts` table has been added to track all payout transactions:

```sql
CREATE TABLE "payouts" (
  "id" varchar PRIMARY KEY,
  "charity_id" varchar NOT NULL,
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
```

### 2. Email Notifications

Every payout now triggers an email notification to `louis@correra.org` with:
- Charity name
- Payout amount
- Platform fees
- Total donations processed
- Donation count
- Stripe transfer ID
- Processing timestamp

### 3. Admin Dashboard

A new admin dashboard at `/admin-payouts` provides:
- Real-time payout statistics
- Payout history with Stripe transfer IDs
- Manual payout processing
- Test payment functionality
- Period-based summaries (daily/weekly/monthly)

### 4. Charity Selection Filtering

Users can now only select charities that have completed Stripe onboarding (`stripeOnboardingComplete: true`).

### 5. Test Payment System

Admin can create test payments to verify the payout process works correctly.

## API Endpoints

### Admin Endpoints

#### Get All Payouts
```
GET /api/admin/payouts
```
Returns all payout transactions.

#### Get Payouts by Charity
```
GET /api/admin/payouts/charity/:charityId
```
Returns payouts for a specific charity.

#### Get Payouts by Date Range
```
GET /api/admin/payouts/date-range?startDate=2024-01-01&endDate=2024-01-31
```
Returns payouts within a date range.

#### Process Payouts Manually
```
POST /api/admin/process-payouts
```
Manually triggers payout processing for all eligible charities.

#### Test Payment
```
POST /api/admin/test-payment
Body: { charityId: "charity_id", amount: 1.00 }
```
Creates a test donation and processes payout immediately.

#### Get Payout Summary
```
GET /api/admin/payout-summary?period=daily
```
Returns summary statistics for daily, weekly, or monthly periods.

### Charity Management

#### Update Payout Frequency
```
POST /api/charities/:id/update-payout-frequency
Body: { frequency: "minute" | "daily" | "weekly" | "monthly" }
```

#### Get Eligible Charities
```
GET /api/charities
```
Returns only charities with completed Stripe onboarding.

## Database Schema Changes

### New Payouts Table
- Tracks all payout transactions
- Links to Stripe transfer IDs for traceability
- Stores platform fees and donation counts
- Includes error handling for failed payouts

### Updated Charities Table
- Added support for "minute" payout frequency
- Maintains existing daily/weekly/monthly options

## Payout Process Flow

1. **Automatic Processing**: Runs every 24 hours via `processCharityPayouts()`
2. **Frequency Check**: Verifies if enough time has passed since last payout
3. **Donation Collection**: Gathers all completed donations for the charity
4. **Fee Calculation**: Applies 2.9% + $0.30 platform fee
5. **Stripe Transfer**: Creates transfer to charity's Stripe Connect account
6. **Record Creation**: Creates payout record in database
7. **Email Notification**: Sends notification to admin
8. **Status Update**: Marks donations as "paid_out"

## Testing the System

### 1. Create Test Payment
```bash
curl -X POST http://localhost:5000/api/admin/test-payment \
  -H "Content-Type: application/json" \
  -d '{"charityId": "your_charity_id", "amount": 1.00}'
```

### 2. Manual Payout Processing
```bash
curl -X POST http://localhost:5000/api/admin/process-payouts
```

### 3. View Payout Summary
```bash
curl "http://localhost:5000/api/admin/payout-summary?period=daily"
```

## Admin Dashboard Features

### Summary Cards
- Total payouts in selected period
- Total amount paid to charities
- Platform fees collected
- Total donations processed

### Payout Table
- Charity name
- Payout amount
- Platform fees
- Donation count and total
- Stripe transfer ID (for tracing)
- Status and date

### Actions
- **Process Payouts**: Manually trigger payout processing
- **Test Payment**: Create test donation and process payout
- **Period Selector**: View daily/weekly/monthly summaries

## Email Notifications

Every payout generates an email to `louis@correra.org` with:

```
Subject: Payout Processed - [Charity Name]

Body:
- Charity: [Name]
- Payout Amount: $[Amount]
- Platform Fee: $[Fee]
- Total Donations: $[Total]
- Donation Count: [Count]
- Stripe Transfer ID: [Transfer ID]
- Processed At: [Timestamp]
```

## Stripe Integration

### Transfer Tracking
- Each payout creates a Stripe transfer
- Transfer ID is stored in payout record
- Can be traced back to original donations
- Supports reconciliation with Stripe dashboard

### Charity Requirements
- Must have completed Stripe Connect onboarding
- Must have `stripeOnboardingComplete: true`
- Must have valid `stripeConnectAccountId`

## Error Handling

### Failed Payouts
- Payout records include error messages
- Failed transfers are logged with details
- System continues processing other charities
- Manual retry available via admin dashboard

### Validation
- Minimum payout amount after fees
- Charity onboarding completion check
- Stripe account verification
- Transfer amount validation

## Migration

To add the new payouts table, run:

```sql
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "payouts_charity_id_idx" ON "payouts"("charity_id");
CREATE INDEX IF NOT EXISTS "payouts_stripe_transfer_id_idx" ON "payouts"("stripe_transfer_id");
CREATE INDEX IF NOT EXISTS "payouts_created_at_idx" ON "payouts"("created_at");
```

## Security Considerations

- Admin endpoints should be protected in production
- Email notifications use admin email (configurable)
- Stripe transfer IDs provide audit trail
- All payout data is logged for compliance

## Future Enhancements

1. **Real-time Notifications**: WebSocket updates for live payout status
2. **Advanced Reporting**: PDF reports and analytics
3. **Multi-currency Support**: Support for different currencies
4. **Batch Processing**: Process multiple charities simultaneously
5. **Webhook Integration**: Real-time Stripe webhook processing
