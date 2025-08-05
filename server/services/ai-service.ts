import OpenAI from "openai";

export class AIService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateContextualAutoReply(
    senderEmail: string,
    recipientEmail: string,
    subject: string,
    emailContent: string,
    charityName: string,
    paymentLink: string
  ): Promise<string> {
    try {
      const prompt = `You are helping to generate a professional auto-reply email for an email filtering service called "${charityName}". 

The email filtering service works by:
1. Intercepting emails from unknown senders
2. Requiring a small $1 donation to access the recipient's inbox
3. This helps reduce spam and supports charity

INCOMING EMAIL DETAILS:
- From: ${senderEmail}
- To: ${recipientEmail}
- Subject: ${subject}
- Content snippet: ${emailContent}

TASK: Generate a professional, contextual auto-reply that:
1. Acknowledges the specific content/purpose of their email
2. Explains the email filtering donation system
3. Provides the payment link
4. Maintains a helpful, professional tone
5. Is personalized to their message but stays focused on the donation request

The response should be 2-3 paragraphs, acknowledge what they wrote about, and guide them to make the $1 donation to reach the recipient's inbox.

Payment link: ${paymentLink}

Generate only the email body text (no subject line):`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a professional email assistant that generates contextual auto-reply messages for an email filtering donation service. Keep responses professional, helpful, and focused on the donation request while acknowledging the sender's original message."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      return response.choices[0].message.content || this.getFallbackTemplate(senderEmail, charityName, paymentLink);
    } catch (error) {
      console.error('Error generating AI auto-reply:', error);
      // Fallback to template if AI fails
      return this.getFallbackTemplate(senderEmail, charityName, paymentLink);
    }
  }

  private getFallbackTemplate(senderEmail: string, charityName: string, paymentLink: string): string {
    return `Thank you for your email. This inbox uses an email filtering system to manage incoming messages.

To ensure your message reaches the recipient's inbox, please make a small $1 donation to ${charityName}. This helps reduce spam and supports a good cause.

Please visit this link to complete your donation and ensure your email is delivered: ${paymentLink}

Once your donation is processed, your email will be released to the recipient's inbox immediately.

Thank you for your understanding and support!`;
  }

  async analyzeEmailContent(subject: string, snippet: string): Promise<{
    intent: string;
    category: string;
    urgency: 'low' | 'medium' | 'high';
    businessRelated: boolean;
  }> {
    try {
      const prompt = `Analyze this email and provide a JSON response with the following structure:
{
  "intent": "brief description of what the sender wants or is asking for",
  "category": "business/personal/promotional/support/other",
  "urgency": "low/medium/high",
  "businessRelated": true/false
}

EMAIL TO ANALYZE:
Subject: ${subject}
Content: ${snippet}

Respond with only valid JSON:`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an email analysis expert. Analyze emails and provide structured JSON responses about their intent, category, urgency, and business relevance."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 150,
        temperature: 0.3,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return {
        intent: analysis.intent || 'General inquiry',
        category: analysis.category || 'other',
        urgency: analysis.urgency || 'low',
        businessRelated: analysis.businessRelated || false
      };
    } catch (error) {
      console.error('Error analyzing email content:', error);
      // Fallback analysis
      return {
        intent: 'General inquiry',
        category: 'other',
        urgency: 'low',
        businessRelated: false
      };
    }
  }
}