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
      const prompt = `You are generating a personalized auto-reply for an email filtering charity system called "${charityName}".

SENDER'S ORIGINAL MESSAGE:
From: ${senderEmail}
Subject: ${subject}
Message: ${emailContent}

YOUR TASK: Create a warm, personalized response that:
1. DIRECTLY acknowledges what they wrote about (their specific business/request/topic)
2. Shows genuine interest in their message/business/proposal
3. Explains the filtering system as a way to support charity while managing messages
4. Makes the $1 donation feel meaningful for the cause
5. Expresses anticipation to continue the conversation after donation

TONE: Friendly, appreciative, and charitable-minded. Make it feel like a real person responding who cares about both the sender's message AND the charitable cause.

STRUCTURE:
- Paragraph 1: Acknowledge their specific message/business/request with genuine interest
- Paragraph 2: Explain the filtering system in a positive, charity-focused way
- Paragraph 3: Payment instructions and anticipation to continue discussion

EXAMPLES OF GOOD RESPONSES:
"Hi [Name], Thanks for reaching out about [specific topic]. [Relevant comment about their business/request]. This inbox uses a filtering system to manage incoming messages. We humbly request a small donation of $1 to ${charityName}. Small donations like yours go a long way to help people in need. Any donation automatically puts this email in our priority inbox. Look forward to [continuing discussion about their topic]. Thanks for your support."

Make it sound natural and conversational, not corporate. The person should feel valued.

Payment link: ${paymentLink}

Generate only the email body (no subject):`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // using the cheaper mini model for cost efficiency
        messages: [
          {
            role: "system",
            content: "You are an empathetic email assistant creating personalized charity donation requests. Your responses should feel genuine, warm, and human - never robotic or corporate. Always acknowledge the sender's specific message and show real interest in their business or request while seamlessly incorporating the donation appeal."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.8,
      });

      return response.choices[0].message.content || this.getFallbackTemplate(senderEmail, charityName, paymentLink);
    } catch (error) {
      console.error('Error generating AI auto-reply:', error);
      // Fallback to template if AI fails
      return this.getFallbackTemplate(senderEmail, charityName, paymentLink);
    }
  }

  private getFallbackTemplate(senderEmail: string, charityName: string, paymentLink: string): string {
    return `Thank you for reaching out! This inbox uses a filtering system to manage incoming messages and support charitable causes.

To ensure your message reaches our priority inbox, we humbly request a small $1 donation to ${charityName}. These small donations make a big difference and help us support those in need.

Please complete your donation here: ${paymentLink}

Once processed, your email will be moved to our priority inbox and you'll be added to our trusted contacts for future messages. We look forward to connecting with you!

Thank you for your support!`;
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
        model: "gpt-4o-mini", // using the cheaper mini model for cost efficiency
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