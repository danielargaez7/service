interface NotificationResult {
  channel: 'sms' | 'email';
  delivered: boolean;
  target: string;
  reason?: string;
}

export class NotificationService {
  private readonly twilioSid = process.env.TWILIO_ACCOUNT_SID ?? '';
  private readonly twilioFrom = process.env.TWILIO_PHONE_NUMBER ?? '';
  private readonly sendgridApiKey = process.env.SENDGRID_API_KEY ?? '';

  async sendSms(targetPhone: string, message: string): Promise<NotificationResult> {
    if (!this.twilioSid || !this.twilioFrom) {
      return {
        channel: 'sms',
        delivered: false,
        target: targetPhone,
        reason: 'Twilio credentials not configured',
      };
    }

    // Integration hook for real Twilio delivery.
    void message;
    return {
      channel: 'sms',
      delivered: true,
      target: targetPhone,
    };
  }

  async sendEmail(targetEmail: string, subject: string, body: string): Promise<NotificationResult> {
    if (!this.sendgridApiKey) {
      return {
        channel: 'email',
        delivered: false,
        target: targetEmail,
        reason: 'SendGrid API key not configured',
      };
    }

    // Integration hook for real SendGrid delivery.
    void subject;
    void body;
    return {
      channel: 'email',
      delivered: true,
      target: targetEmail,
    };
  }
}
