import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: any = null;
  private fromEmail: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'RKC ERP <noreply@rkc.edu.vn>');
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      // Dynamic import to avoid errors when resend is not configured
      import('resend').then(({ Resend }) => {
        this.resend = new Resend(apiKey);
        this.logger.log('✅ Resend email client initialized');
      }).catch(() => {
        this.logger.warn('⚠️ Resend package not available, emails will be logged only');
      });
    } else {
      this.logger.warn('⚠️ RESEND_API_KEY not set — emails will be logged only');
    }
  }

  /**
   * Send invitation email to a new staff member
   */
  async sendInvitationEmail(params: {
    to: string;
    inviterName: string;
    roleName: string;
    inviteLink: string;
    expiresAt: Date;
  }): Promise<{ success: boolean; messageId?: string }> {
    const { to, inviterName, roleName, inviteLink, expiresAt } = params;
    const expiresStr = expiresAt.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const subject = `You're invited to join Royal Kids College ERP`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">Royal Kids College</h1>
              <p style="color:#c7d2fe;font-size:12px;margin:8px 0 0;letter-spacing:2px;text-transform:uppercase;">English Immersion Campus</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="color:#1e293b;font-size:20px;margin:0 0 16px;font-weight:600;">You're Invited! 🎉</h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                <strong>${inviterName}</strong> has invited you to join the <strong>Royal Kids College ERP</strong> system as <strong style="color:#4f46e5;">${roleName}</strong>.
              </p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 32px;">
                Click the button below to create your account and get started:
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;box-shadow:0 4px 12px rgba(79,70,229,0.3);">
                      Create My Account
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Link fallback -->
              <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;word-break:break-all;">
                Or copy this link: <a href="${inviteLink}" style="color:#4f46e5;">${inviteLink}</a>
              </p>
              <!-- Expiry -->
              <div style="margin-top:32px;padding:16px;background-color:#f8fafc;border-radius:8px;border-left:4px solid #f59e0b;">
                <p style="color:#92400e;font-size:13px;margin:0;">
                  ⏰ This invitation expires on <strong>${expiresStr}</strong>
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Royal Kids College ERP · product by yaholab
              </p>
              <p style="color:#cbd5e1;font-size:11px;margin:8px 0 0;">
                If you didn't expect this invitation, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Log to database
    const logEntry = await this.prisma.emailLog.create({
      data: {
        recipient: to,
        subject,
        body: html,
        status: 'pending',
      },
    });

    // Send via Resend if configured
    if (this.resend) {
      try {
        const result = await this.resend.emails.send({
          from: this.fromEmail,
          to: [to],
          subject,
          html,
        });

        await this.prisma.emailLog.update({
          where: { id: logEntry.id },
          data: { status: 'sent', sentAt: new Date() },
        });

        this.logger.log(`📧 Invitation email sent to ${to}`);
        return { success: true, messageId: result.data?.id };
      } catch (err: any) {
        await this.prisma.emailLog.update({
          where: { id: logEntry.id },
          data: { status: 'failed', failReason: err.message },
        });
        this.logger.error(`❌ Failed to send email to ${to}: ${err.message}`);
        return { success: false };
      }
    } else {
      // No email provider — just log
      await this.prisma.emailLog.update({
        where: { id: logEntry.id },
        data: { status: 'skipped', failReason: 'No email provider configured (RESEND_API_KEY not set)' },
      });
      this.logger.warn(`📋 Email logged but NOT sent (no provider): ${to}`);
      return { success: false };
    }
  }
}
