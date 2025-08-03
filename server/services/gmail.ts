import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    // Determine the correct redirect URI based on environment
    let redirectUri = 'http://localhost:5000/setup';
    
    if (process.env.REPLIT_DOMAINS) {
      redirectUri = `https://${process.env.REPLIT_DOMAINS}/setup`;
    } else if (process.env.REPLIT_DOMAIN) {
      redirectUri = `https://${process.env.REPLIT_DOMAIN}/setup`;
    } else if (process.env.GMAIL_REDIRECT_URI) {
      redirectUri = process.env.GMAIL_REDIRECT_URI;
    }
    
    console.log('OAuth Redirect URI:', redirectUri);
    
    this.oauth2Client = new OAuth2Client(
      process.env.GMAIL_CLIENT_ID || "your-gmail-client-id",
      process.env.GMAIL_CLIENT_SECRET || "your-gmail-client-secret", 
      redirectUri
    );
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.labels'
      ],
      prompt: 'consent'
    });
  }

  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  async refreshAccessToken(refreshToken: string) {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }

  private getGmailClient(accessToken: string) {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async createLabels(accessToken: string) {
    const gmail = this.getGmailClient(accessToken);
    
    const labels = [
      { name: 'Email Guardian/Pending Donation', color: { backgroundColor: '#ffa500' } },
      { name: 'Email Guardian/Known Contacts', color: { backgroundColor: '#4caf50' } }
    ];

    const createdLabels = [];
    for (const label of labels) {
      try {
        const response = await gmail.users.labels.create({
          userId: 'me',
          requestBody: label
        });
        createdLabels.push(response.data);
      } catch (error: any) {
        if (error.code !== 409) { // Label already exists
          throw error;
        }
      }
    }

    return createdLabels;
  }

  async getLabels(accessToken: string) {
    const gmail = this.getGmailClient(accessToken);
    const response = await gmail.users.labels.list({ userId: 'me' });
    return response.data.labels || [];
  }

  async getMessages(accessToken: string, query?: string, maxResults = 50) {
    const gmail = this.getGmailClient(accessToken);
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults
    });
    return response.data.messages || [];
  }

  async getMessage(accessToken: string, messageId: string) {
    const gmail = this.getGmailClient(accessToken);
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });
    return response.data;
  }

  async addLabel(accessToken: string, messageId: string, labelId: string) {
    const gmail = this.getGmailClient(accessToken);
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: [labelId]
      }
    });
  }

  async removeLabel(accessToken: string, messageId: string, labelId: string) {
    const gmail = this.getGmailClient(accessToken);
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: [labelId]
      }
    });
  }

  async moveToInbox(accessToken: string, messageId: string) {
    const gmail = this.getGmailClient(accessToken);
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: ['INBOX'],
        removeLabelIds: ['SPAM']
      }
    });
  }

  async sendEmail(accessToken: string, to: string, subject: string, body: string) {
    const gmail = this.getGmailClient(accessToken);
    
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
  }

  extractEmailAddress(header: string): string {
    const emailMatch = header.match(/<([^>]+)>/);
    return emailMatch ? emailMatch[1] : header;
  }

  getHeaderValue(headers: any[], name: string): string {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  }
}

export const gmailService = new GmailService();
