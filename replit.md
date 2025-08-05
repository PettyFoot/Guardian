# Email Guardian

## Overview

Email Guardian is a full-stack web application that filters emails through a donation-based gating system. The application connects to users' Gmail accounts and automatically filters emails from unknown senders by requiring a small donation payment before allowing the email to reach the user's inbox. Known contacts are whitelisted and their emails pass through directly.

The system uses React for the frontend with shadcn/ui components, Express.js for the backend API, Drizzle ORM with PostgreSQL for data persistence, Gmail API for email management, and Stripe for payment processing.

## Current Status (January 2025)

✅ **Completed Infrastructure:**
- Full-stack application architecture with TypeScript
- PostgreSQL database with Drizzle ORM schema
- React frontend with shadcn/ui components and Tailwind CSS
- Express.js backend API with service layer architecture
- Gmail API integration service with OAuth 2.0 support
- Stripe payment processing service (optional, configurable)
- Complete UI for dashboard, email queue, contacts, donations, and settings
- Setup page for initial Gmail authentication
- **NEW:** Configurable email check intervals (30 seconds to 1 hour)
- **NEW:** Historical email processing that checks emails since last check time
- **NEW:** User settings for email processing frequency with API usage information

⏳ **Pending Setup Requirements:**
- Gmail OAuth credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI)
- Stripe API keys for payment processing (STRIPE_SECRET_KEY, VITE_STRIPE_PUBLIC_KEY)

🎯 **Ready for Use:** 
The application is fully functional and ready for deployment once API credentials are provided.

## Recent Changes (January 5, 2025)
- **Database Overhaul & Cleanup:**
  - **MAJOR**: Deleted all pending_emails data to start fresh
  - **MAJOR**: Added timestamps (`created_at`, `updated_at`) to all database tables
  - Updated all storage methods to automatically set `updatedAt` on record updates
  - Enhanced schema with comprehensive timestamp tracking for audit trails
  - All new database entries now include proper creation and modification timestamps

- **Email Status & Payment Flow Fixes:**
  - Fixed email status tracking: paid emails now correctly show as "paid" instead of "released" 
  - Resolved "Paid" filter functionality to properly display paid emails
  - Fixed donations page authentication to show actual donation data ($3.00 from 3 donations)
  - Enhanced webhook system to properly mark emails as "paid" upon payment completion
  - Created utility endpoint to retroactively update email statuses for whitelisted contacts

- **Dynamic Payment Link System:**
  - Implemented dynamic Stripe payment links with custom charity names
  - Added payment_intentions table to track sender-to-recipient payment mapping
  - Enhanced webhook handling for dynamic payments with automatic sender whitelisting
  - Created payment success page with detailed confirmation messaging
  - Integrated charity name customization in user settings

- **Previous Updates (January 4, 2025):**
  - Email Processing: Configurable check intervals (30 seconds to 1 hour)
  - Stripe Integration: Full payment processing with webhooks
  - Auto-Reply Fixes: Eliminated duplicate email issues

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Routing**: wouter for client-side routing with pages for dashboard, email queue, contacts, donations, and settings
- **State Management**: TanStack Query for server state management and API calls
- **Build System**: Vite with TypeScript compilation and hot module replacement

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful API with routes for Gmail OAuth, email processing, contact management, and donation handling
- **Email Processing**: Service-based architecture with dedicated services for Gmail API integration, Stripe payment processing, and email filtering logic
- **Database Layer**: Drizzle ORM providing type-safe database operations with a storage abstraction layer

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM schema definition
- **Schema Design**: 
  - Users table storing Gmail tokens and Stripe customer IDs
  - Contacts table for whitelisted email addresses
  - Pending emails table tracking filtered messages and donation status
  - Donations table recording completed payments
  - Email stats table for analytics and dashboard metrics
- **Migrations**: Drizzle Kit for database schema management and migrations

### Authentication and Authorization
- **Gmail OAuth**: OAuth 2.0 flow for Gmail API access with token refresh handling
- **Session Management**: Connect-pg-simple for PostgreSQL-backed session storage
- **API Security**: Request logging middleware and error handling for API routes

### External Service Integrations
- **Gmail API**: Google APIs client library for reading emails, managing labels, and email operations
- **Stripe Integration**: Stripe SDK for payment link generation, checkout sessions, and webhook handling
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **Email Processing**: Automated filtering system that creates donation requests for unknown senders and manages email release after payment

### Key Design Patterns
- **Service Layer Pattern**: Separate services for Gmail, Stripe, and email processing logic
- **Repository Pattern**: Storage abstraction layer providing a clean interface for database operations
- **Middleware Pattern**: Express middleware for request logging, error handling, and authentication
- **Component Composition**: React components using shadcn/ui patterns with proper TypeScript typing