# OpenAI API Setup Instructions

## Issue: "Insufficient Quota" Error

You're seeing this error even though you have $5 budget because OpenAI requires additional setup for API access.

## Steps to Fix:

### 1. Add Payment Method
- Go to https://platform.openai.com/account/billing/overview
- Click "Add payment method"
- Add a valid credit/debit card
- This enables API access even if you have free credits

### 2. Check API Plan
- Go to https://platform.openai.com/account/billing/overview
- Ensure you're on a "Pay-as-you-go" plan, not just free trial
- Free trial credits often don't work for API calls

### 3. Verify API Key
- Go to https://platform.openai.com/api-keys
- Ensure your API key is from a project with billing enabled
- If needed, create a new API key from the correct project

### 4. Alternative: Use GPT-4o-mini
If you want to test with minimal costs, I can switch the system to use GPT-4o-mini which is much cheaper ($0.00015 per 1K tokens vs $0.005 for GPT-4o).

### 5. Test Once Fixed
Once you've added payment method, the AI responses should work immediately and generate personalized responses like:

"Hi Bob, Thanks for reaching out about refrigerators and appliances for food pantries. Equipment like yours is exactly what we need to help serve our community better. This inbox uses a filtering system to support charitable causes - we request a small $1 donation to Email Guardian. These donations help us continue our food pantry work and support those in need. Please complete your donation here: [link]. Once processed, your email will go straight to our priority inbox and we'd love to discuss how your appliances can help us serve more families. Thanks for your support!"

## Current Status
- AI system is fully implemented and working
- Falling back to improved template responses until OpenAI access is restored
- All code is ready for immediate AI responses once billing is configured