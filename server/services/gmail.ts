import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.OAUTH_REDIRECT_URI || 'http://localhost:5000/setup';

    if (!clientId || !clientSecret) {
      throw new Error('Gmail OAuth credentials not configured');
    }

    this.oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.labels',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.send'
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

  async revokeTokens(refreshToken: string) {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    await this.oauth2Client.revokeCredentials();
  }

  private getGmailClient(accessToken: string) {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async createLabels(accessToken: string) {
    const gmail = this.getGmailClient(accessToken);
    
    const labels = [
      { 
        name: 'Email Guardian/Pending Donation', 
        color: { 
          backgroundColor: '#ffa500',
          textColor: '#000000'
        } 
      },
      { 
        name: 'Email Guardian/Known Contacts', 
        color: { 
          backgroundColor: '#4caf50',
          textColor: '#ffffff'
        } 
      }
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

  async removeFromInbox(accessToken: string, messageId: string) {
    const gmail = this.getGmailClient(accessToken);
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['INBOX']
      }
    });
  }

  async sendEmail(accessToken: string, to: string, subject: string, body: string) {
    const gmail = this.getGmailClient(accessToken);
    
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
  }

  getHeaderValue(headers: any[], name: string): string {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  }

  extractEmailAddress(fromHeader: string): string {
    const match = fromHeader.match(/<(.+?)>/) || fromHeader.match(/(\S+@\S+)/);
    return match ? match[1] : fromHeader;
  }
}

export const gmailService = new GmailService();