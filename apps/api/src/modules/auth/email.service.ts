import { Resend } from "resend";
import { AppError } from "../_core/errors/app-error.js";

export type EmailOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type EmailTransport = {
  send(options: EmailOptions & { from: string }): Promise<{
    error?: { message?: string } | null;
  }>;
};

type EmailServiceOptions = {
  allowConsoleFallback?: boolean;
  logger?: Pick<Console, "error" | "log">;
  transport?: EmailTransport | null;
};

export class EmailService {
  private readonly allowConsoleFallback: boolean;
  private readonly logger: Pick<Console, "error" | "log">;
  private readonly transport: EmailTransport | null;

  constructor(
    readonly apiKey: string | undefined,
    private readonly fromAddress: string,
    options: EmailServiceOptions = {},
  ) {
    assertValidFromAddress(fromAddress);
    this.allowConsoleFallback = options.allowConsoleFallback ?? true;
    this.logger = options.logger ?? console;
    this.transport =
      options.transport ??
      (apiKey
        ? (new Resend(apiKey).emails as unknown as EmailTransport)
        : null);

    if (!this.transport && !this.allowConsoleFallback) {
      throw new Error("RESEND_API_KEY must be configured for email delivery.");
    }
  }

  async sendVerificationEmail(input: {
    to: string;
    firstName: string;
    verificationUrl: string;
  }): Promise<void> {
    await this.send({
      to: input.to,
      subject: "Verify your email address",
      html: verificationEmailHtml(input.firstName, input.verificationUrl),
      text: verificationEmailText(input.firstName, input.verificationUrl),
    });
  }

  async sendPasswordResetEmail(input: {
    to: string;
    firstName: string;
    resetUrl: string;
  }): Promise<void> {
    await this.send({
      to: input.to,
      subject: "Reset your password",
      html: passwordResetEmailHtml(input.firstName, input.resetUrl),
      text: passwordResetEmailText(input.firstName, input.resetUrl),
    });
  }

  private async send(options: EmailOptions): Promise<void> {
    if (!this.transport) {
      this.logger.log(
        `[EMAIL] To: ${options.to} | Subject: ${options.subject}`,
      );
      this.logger.log(`[EMAIL] Text: ${options.text}`);
      return;
    }

    try {
      const { error } = await this.transport.send({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        this.logger.error("[email] Provider rejected message.", {
          error: error.message,
          subject: options.subject,
          to: options.to,
        });
        throw emailDeliveryError();
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error("[email] Provider request failed.", {
        error: error instanceof Error ? error.message : String(error),
        subject: options.subject,
        to: options.to,
      });
      throw emailDeliveryError();
    }
  }
}

function assertValidFromAddress(fromAddress: string): void {
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fromAddress)) return;
  if (/^.+ <[^@\s]+@[^@\s]+\.[^@\s]+>$/.test(fromAddress)) return;

  throw new Error("EMAIL_FROM_ADDRESS must be a valid email sender address.");
}

function emailDeliveryError(): AppError {
  return new AppError({
    code: "internal_error",
    detail:
      "The email provider could not deliver this message. Try again later or contact support.",
    statusCode: 502,
    title: "Email delivery failed",
  });
}

function verificationEmailHtml(firstName: string, url: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">Verify your email</h1>
  <p style="color: #374151; margin-bottom: 24px;">Hi ${escapeHtml(firstName)}, please verify your email address to unlock full access to your account.</p>
  <a href="${escapeHtml(url)}" style="display:inline-block;background:#111827;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">Verify email address</a>
  <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
  <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">Or copy this link: ${escapeHtml(url)}</p>
</body>
</html>`;
}

function verificationEmailText(firstName: string, url: string): string {
  return `Hi ${firstName},\n\nPlease verify your email address by visiting the link below:\n\n${url}\n\nThis link expires in 24 hours. If you didn't create an account, you can safely ignore this email.`;
}

function passwordResetEmailHtml(firstName: string, url: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">Reset your password</h1>
  <p style="color: #374151; margin-bottom: 24px;">Hi ${escapeHtml(firstName)}, we received a request to reset your password.</p>
  <a href="${escapeHtml(url)}" style="display:inline-block;background:#111827;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">Reset password</a>
  <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
  <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">Or copy this link: ${escapeHtml(url)}</p>
</body>
</html>`;
}

function passwordResetEmailText(firstName: string, url: string): string {
  return `Hi ${firstName},\n\nWe received a request to reset your password. Visit the link below to set a new password:\n\n${url}\n\nThis link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
