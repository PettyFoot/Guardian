import { storage } from '../storage';
import { gmailService } from './gmail';
import { stripeService } from './stripe';
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

    // Check if sender is whitelisted
    const isWhitelisted = await storage.isEmailWhitelisted(user.id, senderEmail);
    
    if (isWhitelisted) {
      // Email is from known contact, ensure it's in inbox
      await gmailService.moveToInbox(user.gmailToken!, messageId);
      return;
    }

    // Check if we've already processed this email
    const existingPendingEmail = await storage.getPendingEmailByGmailId(user.id, messageId);
    if (existingPendingEmail) {
      return; // Already processed
    }

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

    // Create donation checkout session
    const { sessionId, url } = await stripeService.createCheckoutSession(
      senderEmail, 
      pendingEmail.id
    );

    // Update pending email with session info
    await storage.updatePendingEmailDonationLink(pendingEmail.id, sessionId);

    // Add label to Gmail message
    const labels = await gmailService.getLabels(user.gmailToken!);
    const pendingLabel = labels.find(l => l.name === 'Email Guardian/Pending Donation');
    
    if (pendingLabel?.id) {
      await gmailService.addLabel(user.gmailToken!, messageId, pendingLabel.id);
    }

    // Send auto-reply with donation link
    await this.sendDonationRequest(user, senderEmail, subject, url);

    // Update stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await storage.getEmailStats(user.id, today);
    const currentFiltered = stats ? parseInt(stats.emailsFiltered || "0") : 0;
    
    await storage.createOrUpdateEmailStats(user.id, today, {
      emailsFiltered: (currentFiltered + 1).toString()
    });
  }

  private async sendDonationRequest(user: User, senderEmail: string, originalSubject: string, donationUrl: string) {
    const subject = `Re: ${originalSubject} - Email Access Request`;
    const body = `
Hello,

Thank you for your email. To help manage my inbox and reduce spam, I use an email filtering system that requires a small $1 donation for unknown senders to ensure your message reaches me.

This one-time payment grants you permanent access to my inbox for future emails.

Please complete your donation here: ${donationUrl}

Once your donation is confirmed, your original email will be delivered to my inbox and you'll be added to my known contacts list.

Thank you for understanding!

Best regards,
Email Guardian System
    `.trim();

    await gmailService.sendEmail(user.gmailToken!, senderEmail, subject, body);
  }

  async processDonationComplete(sessionId: string) {
    const session = await stripeService.getSession(sessionId);
    
    if (session.payment_status !== 'paid') {
      return;
    }

    const senderEmail = session.metadata?.sender_email;
    const pendingEmailId = session.metadata?.pending_email_id;

    if (!senderEmail || !pendingEmailId) {
      throw new Error('Missing metadata in Stripe session');
    }

    // Find the pending email
    const pendingEmail = await storage.getPendingEmails(session.customer_details?.email || '');
    const targetEmail = pendingEmail.find(e => e.id === pendingEmailId);
    
    if (!targetEmail) {
      throw new Error('Pending email not found');
    }

    // Create donation record
    await storage.createDonation({
      userId: targetEmail.userId,
      pendingEmailId: targetEmail.id,
      stripeSessionId: sessionId,
      amount: (session.amount_total! / 100).toString(),
      senderEmail: senderEmail,
      status: 'completed'
    });

    // Add sender to contacts
    const existingContact = await storage.getContactByEmail(targetEmail.userId, senderEmail);
    if (!existingContact) {
      await storage.createContact({
        userId: targetEmail.userId,
        email: senderEmail,
        isWhitelisted: true
      });
    }

    // Get user for Gmail operations
    const user = await storage.getUser(targetEmail.userId);
    if (!user?.gmailToken) {
      throw new Error('User Gmail token not found');
    }

    // Move email to inbox and add known contacts label
    await gmailService.moveToInbox(user.gmailToken, targetEmail.gmailMessageId);
    
    const labels = await gmailService.getLabels(user.gmailToken);
    const knownContactsLabel = labels.find(l => l.name === 'Email Guardian/Known Contacts');
    const pendingLabel = labels.find(l => l.name === 'Email Guardian/Pending Donation');
    
    if (knownContactsLabel?.id) {
      await gmailService.addLabel(user.gmailToken, targetEmail.gmailMessageId, knownContactsLabel.id);
    }
    
    if (pendingLabel?.id) {
      await gmailService.removeLabel(user.gmailToken, targetEmail.gmailMessageId, pendingLabel.id);
    }

    // Update pending email status
    await storage.updatePendingEmailStatus(targetEmail.id, 'released');

    // Update stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await storage.getEmailStats(targetEmail.userId, today);
    const currentDonations = stats ? parseFloat(stats.donationsReceived || "0") : 0;
    
    await storage.createOrUpdateEmailStats(targetEmail.userId, today, {
      donationsReceived: (currentDonations + parseFloat((session.amount_total! / 100).toString())).toString()
    });
  }
}

export const emailProcessor = new EmailProcessor();
