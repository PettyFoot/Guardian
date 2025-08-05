import { storage } from '../storage';
import { gmailService } from './gmail';
import type { User } from '@shared/schema';

export class EmailProcessor {
  async processNewEmails(user: User): Promise<void> {
    if (!user.gmailToken) {
      throw new Error('User does not have Gmail token');
    }

    try {
      // Calculate time range based on last check and current interval
      const intervalMinutes = parseFloat(user.emailCheckInterval || "1.0");
      const lastCheckTime = user.lastEmailCheck ? new Date(user.lastEmailCheck) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to 24h ago if never checked
      
      // Format date for Gmail search (YYYY/MM/DD format)
      const after = lastCheckTime.toISOString().split('T')[0].replace(/-/g, '/');
      
      // Get emails from the last check time, including unread and already read emails that might have been missed
      // Exclude sent emails and emails from the user's own address to prevent processing auto-replies
      const query = `after:${after} -label:spam -from:${user.email} -in:sent`;
      const messages = await gmailService.getMessages(
        user.gmailToken,
        query,
        50 // Increased limit to catch more emails during busy periods
      );

      console.log(`Found ${messages.length} messages since ${after} for user ${user.email}`);

      for (const message of messages) {
        if (!message.id) continue;
        
        await this.processMessage(user, message.id);
      }
    } catch (error: any) {
      if (error.code === 401) {
        // Token expired, try to refresh
        if (user.gmailRefreshToken) {
          const newTokens = await gmailService.refreshAccessToken(user.gmailRefreshToken);
          if (newTokens.access_token) {
            await storage.updateUserGmailTokens(user.id, newTokens.access_token, user.gmailRefreshToken);
            // Retry processing
            return this.processNewEmails(user);
          }
        }
      }
      throw error;
    }
  }

  private async processMessage(user: User, messageId: string) {
    const message = await gmailService.getMessage(user.gmailToken!, messageId);
    
    if (!message.payload?.headers) return;

    const headers = message.payload.headers;
    const fromHeader = gmailService.getHeaderValue(headers, 'From');
    const senderEmail = gmailService.extractEmailAddress(fromHeader);
    const subject = gmailService.getHeaderValue(headers, 'Subject');
    const snippet = message.snippet || '';

    console.log(`Processing email from: ${senderEmail}, subject: ${subject}`);

    // Skip auto-reply emails from the system itself
    if (senderEmail === user.email) {
      console.log(`Skipping email from user's own email address: ${senderEmail}`);
      return;
    }

    // Skip emails that are replies to auto-reply messages (containing "Email Access Request")
    if (subject.includes('Email Access Request') || 
        subject.includes('Re: Re:') || 
        subject.match(/^Re:\s+.*\s+-\s+Email Access Request/)) {
      console.log(`Skipping auto-reply or duplicate reply: ${subject}`);
      return;
    }

    // Skip emails with mailer-daemon or no-reply addresses
    if (senderEmail.includes('mailer-daemon') || 
        senderEmail.includes('no-reply') || 
        senderEmail.includes('noreply') ||
        senderEmail.includes('daemon@')) {
      console.log(`Skipping system/automated email from: ${senderEmail}`);
      return;
    }

    // Check if sender is whitelisted
    const isWhitelisted = await storage.isEmailWhitelisted(user.id, senderEmail);
    
    if (isWhitelisted) {
      console.log(`Email from ${senderEmail} is whitelisted, keeping in inbox`);
      // Email is from known contact, ensure it's in inbox
      await gmailService.moveToInbox(user.gmailToken!, messageId);
      return;
    }

    // Check if we've already processed this email
    const existingPendingEmail = await storage.getPendingEmailByGmailId(user.id, messageId);
    if (existingPendingEmail) {
      console.log(`Email from ${senderEmail} already processed`);
      return; // Already processed
    }

    console.log(`Filtering email from unknown sender: ${senderEmail}`);

    // Create pending email record
    const pendingEmail = await storage.createPendingEmail({
      userId: user.id,
      gmailMessageId: messageId,
      sender: senderEmail,
      subject,
      snippet,
      receivedAt: new Date(parseInt(message.internalDate || '0')),
      status: 'pending'
    });

    // Update pending email status
    await storage.updatePendingEmailDonationLink(pendingEmail.id, 'manual-request');

    // Add label to Gmail message
    const labels = await gmailService.getLabels(user.gmailToken!);
    const pendingLabel = labels.find(l => l.name === 'Email Guardian/Pending Donation');
    
    if (pendingLabel?.id) {
      await gmailService.addLabel(user.gmailToken!, messageId, pendingLabel.id);
    }

    // Create dynamic Stripe payment link for the donation
    try {
      const paymentResponse = await fetch('http://localhost:5000/api/create-dynamic-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: user.email,
          senderEmail,
          charityName: user.charityName || 'Email Guardian',
          amount: 1.00 // $1 donation
        })
      });
      
      const paymentData = await paymentResponse.json();
      
      if (paymentData.paymentLink) {
        // Update pending email with payment link
        await storage.updatePendingEmailDonationLink(pendingEmail.id, paymentData.paymentLinkId);
        
        // Send auto-reply with donation request
        await this.sendDonationRequest(user, senderEmail, subject, paymentData.paymentLink);
      } else {
        console.error('Failed to create dynamic payment link:', paymentData.message);
        // Fallback to regular payment link
        const fallbackResponse = await fetch('http://localhost:5000/api/create-payment-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 1.00,
            senderEmail,
            pendingEmailId: pendingEmail.id,
            userId: user.id
          })
        });
        
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.paymentUrl) {
          await storage.updatePendingEmailDonationLink(pendingEmail.id, fallbackData.paymentLinkId);
          await this.sendDonationRequest(user, senderEmail, subject, fallbackData.paymentUrl);
        } else {
          await this.sendDonationRequest(user, senderEmail, subject, 'Please contact us for payment instructions.');
        }
      }
    } catch (error: any) {
      console.error('Error creating payment link:', error.message);
      // Fallback to manual donation request
      await this.sendDonationRequest(user, senderEmail, subject, 'Please contact us for payment instructions.');
    }
    
    // Remove from inbox since it's now pending donation
    await gmailService.removeFromInbox(user.gmailToken!, messageId);

    // Update stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await storage.getEmailStats(user.id, today);
    const currentFiltered = stats ? parseInt(stats.emailsFiltered || "0") : 0;
    
    await storage.createOrUpdateEmailStats(user.id, today, {
      emailsFiltered: (currentFiltered + 1).toString()
    });

    console.log(`Successfully filtered email from ${senderEmail} and sent auto-reply`);
  }

  private async sendDonationRequest(user: User, senderEmail: string, originalSubject: string, donationUrl: string) {
    const subject = `Re: ${originalSubject} - Email Access Request`;
    const charityName = user.charityName || 'Email Guardian';
    const body = `
Hello,

Thank you for your email. To help manage my inbox and reduce spam, I use an email filtering system that requires a small $1 donation for unknown senders to ensure your message reaches me.

This one-time payment to ${charityName} grants you permanent access to my inbox for future emails.

To complete your donation and have your email delivered:

🔗 **Complete Your $1 Donation Here:** ${donationUrl}

Once your payment is confirmed:
- Your original email will be delivered to my inbox
- You'll be added to my known contacts list for future emails
- All future emails from you will bypass the filtering system

This filtering system helps reduce spam while ensuring legitimate emails reach me. Thank you for understanding and for supporting ${charityName}!

Best regards,
Email Guardian System
    `.trim();
    
    await gmailService.sendEmail(user.gmailToken!, senderEmail, subject, body);
  }

  async processDonationComplete(senderEmail: string, userId: string) {
    // Manual donation processing (for when payments are confirmed manually)
    
    // Add sender to contacts (whitelist them)
    const existingContact = await storage.getContactByEmail(userId, senderEmail);
    if (!existingContact) {
      await storage.createContact({
        userId: userId,
        email: senderEmail,
        isWhitelisted: true
      });
    }

    // Get user for Gmail operations
    const user = await storage.getUser(userId);
    if (!user?.gmailToken) {
      throw new Error('User Gmail token not found');
    }

    // Find pending emails from this sender
    const pendingEmails = await storage.getPendingEmails(userId);
    const senderPendingEmails = pendingEmails.filter(e => e.sender === senderEmail);

    // Move all emails from this sender to inbox
    for (const pendingEmail of senderPendingEmails) {
      await gmailService.moveToInbox(user.gmailToken, pendingEmail.gmailMessageId);
      
      const labels = await gmailService.getLabels(user.gmailToken);
      const knownContactsLabel = labels.find(l => l.name === 'Email Guardian/Known Contacts');
      const pendingLabel = labels.find(l => l.name === 'Email Guardian/Pending Donation');
      
      if (knownContactsLabel?.id) {
        await gmailService.addLabel(user.gmailToken, pendingEmail.gmailMessageId, knownContactsLabel.id);
      }
      
      if (pendingLabel?.id) {
        await gmailService.removeLabel(user.gmailToken, pendingEmail.gmailMessageId, pendingLabel.id);
      }

      // Update pending email status
      await storage.updatePendingEmailStatus(pendingEmail.id, 'paid');
    }

    // Update stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await storage.getEmailStats(userId, today);
    const currentDonations = stats ? parseFloat(stats.donationsReceived || "0") : 0;
    
    await storage.createOrUpdateEmailStats(userId, today, {
      donationsReceived: (currentDonations + 1.00).toString()
    });
  }
}

export const emailProcessor = new EmailProcessor();