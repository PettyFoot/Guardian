import { storage } from '../storage';
import { gmailService } from './gmail';
import type { User } from '@shared/schema';

export class EmailProcessor {
  async processNewEmails(user: User): Promise<void> {
    if (!user.gmailToken) {
      throw new Error('User does not have Gmail token');
    }

    try {
      // Get recent unread emails
      const messages = await gmailService.getMessages(
        user.gmailToken,
        'is:unread -label:spam',
        20
      );

      console.log(`Found ${messages.length} unread messages for user ${user.email}`);

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

    // Send auto-reply with donation request
    const donationUrl = `Please reply to this email to confirm you've made a $1 donation to access this inbox.`;
    await this.sendDonationRequest(user, senderEmail, subject, donationUrl);
    
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
    const body = `
Hello,

Thank you for your email. To help manage my inbox and reduce spam, I use an email filtering system that requires a small $1 donation for unknown senders to ensure your message reaches me.

This one-time payment grants you permanent access to my inbox for future emails.

To complete your donation and have your email delivered:
1. Send a $1 donation via PayPal, Venmo, or your preferred method
2. Reply to this email confirming you've made the donation
3. Your original email will then be delivered to my inbox
4. You'll be added to my known contacts list for future emails

Payment methods:
- PayPal: [Add your PayPal email]
- Venmo: [Add your Venmo username] 
- Other: Contact me for alternative payment methods

Thank you for understanding this filtering system helps reduce spam!

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
      await storage.updatePendingEmailStatus(pendingEmail.id, 'released');
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