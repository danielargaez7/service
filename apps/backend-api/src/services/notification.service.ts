interface NotificationResult {
  channel: 'sms' | 'email';
  delivered: boolean;
  target: string;
  reason?: string;
}

export class NotificationService {
  private readonly twilioSid = process.env.TWILIO_ACCOUNT_SID ?? '';
  private readonly twilioToken = process.env.TWILIO_AUTH_TOKEN ?? '';
  private readonly twilioFrom = process.env.TWILIO_PHONE_NUMBER ?? '';
  private readonly sendgridApiKey = process.env.SENDGRID_API_KEY ?? '';
  private readonly fromEmail = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@servicecore.com';

  async sendSms(targetPhone: string, message: string): Promise<NotificationResult> {
    if (!this.twilioSid || !this.twilioToken || !this.twilioFrom) {
      return {
        channel: 'sms',
        delivered: false,
        target: targetPhone,
        reason: 'Twilio credentials not configured',
      };
    }

    try {
      const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');
      const body = new URLSearchParams({
        To: targetPhone,
        From: this.twilioFrom,
        Body: message,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error('[notification/sms] Twilio error:', err);
        return { channel: 'sms', delivered: false, target: targetPhone, reason: `Twilio error: ${response.status}` };
      }

      return { channel: 'sms', delivered: true, target: targetPhone };
    } catch (err) {
      console.error('[notification/sms]', err);
      return { channel: 'sms', delivered: false, target: targetPhone, reason: (err as Error).message };
    }
  }

  async sendEmail(targetEmail: string, subject: string, body: string): Promise<NotificationResult> {
    if (!this.sendgridApiKey) {
      console.log(`[notification/email] No SendGrid key — would send to ${targetEmail}: "${subject}"`);
      return {
        channel: 'email',
        delivered: false,
        target: targetEmail,
        reason: 'SendGrid API key not configured — email logged to console',
      };
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: targetEmail }] }],
          from: { email: this.fromEmail, name: 'ServiceCore' },
          subject,
          content: [
            { type: 'text/plain', value: body },
            {
              type: 'text/html',
              value: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                  <div style="border-bottom: 3px solid #f97316; padding-bottom: 16px; margin-bottom: 24px;">
                    <h1 style="margin: 0; font-size: 20px; color: #1e293b;">ServiceCore</h1>
                  </div>
                  <h2 style="font-size: 16px; color: #1e293b;">${subject}</h2>
                  <p style="color: #475569; line-height: 1.6;">${body}</p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                  <p style="font-size: 12px; color: #94a3b8;">This is an automated notification from ServiceCore Time Tracking.</p>
                </div>
              `,
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('[notification/email] SendGrid error:', response.status, err);
        return { channel: 'email', delivered: false, target: targetEmail, reason: `SendGrid error: ${response.status}` };
      }

      return { channel: 'email', delivered: true, target: targetEmail };
    } catch (err) {
      console.error('[notification/email]', err);
      return { channel: 'email', delivered: false, target: targetEmail, reason: (err as Error).message };
    }
  }
}
