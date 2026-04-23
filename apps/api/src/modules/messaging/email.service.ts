import type { EmailTemplateSettings } from "@shop/database";
import { Resend } from "resend";
import { AppError } from "../_core/errors/app-error.js";
import { assertValidFromAddress, emailDeliveryError } from "./email-errors.js";
import type {
  EmailDeliveryRecorder,
  EmailOptions,
  EmailServiceOptions,
  EmailTransport,
} from "./email-service.types.js";
import { renderConfiguredEmailTemplate } from "./email-template-renderer.js";
import {
  passwordResetEmailHtml,
  passwordResetEmailText,
  supplierInviteEmailHtml,
  supplierInviteEmailText,
  verificationEmailHtml,
  verificationEmailText,
} from "./fallback-email-templates.js";

export class EmailService {
  private readonly allowConsoleFallback: boolean;
  private readonly deliveryRecorder: EmailDeliveryRecorder | null;
  private readonly logger: Pick<Console, "error" | "log">;
  private readonly templateProvider:
    | NonNullable<EmailServiceOptions["templateProvider"]>
    | undefined;
  private readonly transport: EmailTransport | null;

  constructor(
    readonly apiKey: string | undefined,
    private readonly fromAddress: string,
    options: EmailServiceOptions = {},
  ) {
    assertValidFromAddress(fromAddress);
    this.allowConsoleFallback = options.allowConsoleFallback ?? true;
    this.deliveryRecorder = options.deliveryRecorder ?? null;
    this.logger = options.logger ?? console;
    this.templateProvider = options.templateProvider;
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
    const configured = await this.renderConfiguredTemplate(
      "emailVerification",
      {
        actionUrl: input.verificationUrl,
        fallback: {
          html: verificationEmailHtml(input.firstName, input.verificationUrl),
          subject: "Verify your email address",
          text: verificationEmailText(input.firstName, input.verificationUrl),
        },
        variables: { firstName: input.firstName },
      },
    );
    await this.send({
      messageType: "email_verification",
      ...(configured.replyTo ? { replyTo: configured.replyTo } : {}),
      to: input.to,
      subject: configured.subject,
      html: configured.html,
      text: configured.text,
    });
  }

  async sendPasswordResetEmail(input: {
    to: string;
    firstName: string;
    resetUrl: string;
  }): Promise<void> {
    const configured = await this.renderConfiguredTemplate("passwordReset", {
      actionUrl: input.resetUrl,
      fallback: {
        html: passwordResetEmailHtml(input.firstName, input.resetUrl),
        subject: "Reset your password",
        text: passwordResetEmailText(input.firstName, input.resetUrl),
      },
      variables: { firstName: input.firstName },
    });
    await this.send({
      messageType: "password_reset",
      ...(configured.replyTo ? { replyTo: configured.replyTo } : {}),
      to: input.to,
      subject: configured.subject,
      html: configured.html,
      text: configured.text,
    });
  }

  async sendSupplierInviteEmail(input: {
    to: string;
    firstName: string;
    supplierName: string;
    setupUrl: string;
  }): Promise<void> {
    const configured = await this.renderConfiguredTemplate("supplierInvite", {
      actionUrl: input.setupUrl,
      fallback: {
        html: supplierInviteEmailHtml(input),
        subject: `Supplier portal invitation for ${input.supplierName}`,
        text: supplierInviteEmailText(input),
      },
      variables: {
        firstName: input.firstName,
        supplierName: input.supplierName,
      },
    });
    await this.send({
      messageType: "supplier_invite",
      ...(configured.replyTo ? { replyTo: configured.replyTo } : {}),
      to: input.to,
      subject: configured.subject,
      html: configured.html,
      text: configured.text,
    });
  }

  async sendTestEmail(input: { to: string }): Promise<void> {
    const configured = await this.renderConfiguredTemplate(
      "emailVerification",
      {
        actionUrl: "https://app.example.com/email-test",
        fallback: {
          html: verificationEmailHtml(
            "Operator",
            "https://app.example.com/email-test",
          ),
          subject: "Email delivery test",
          text: verificationEmailText(
            "Operator",
            "https://app.example.com/email-test",
          ),
        },
        variables: { firstName: "Operator" },
      },
    );
    await this.send({
      messageType: "email_verification",
      ...(configured.replyTo ? { replyTo: configured.replyTo } : {}),
      to: input.to,
      subject: `[Test] ${configured.subject}`,
      html: configured.html,
      text: configured.text,
    });
  }

  private async renderConfiguredTemplate(
    templateKey: keyof EmailTemplateSettings,
    input: {
      actionUrl: string;
      fallback: { html: string; subject: string; text: string };
      variables: Record<string, string>;
    },
  ): Promise<{
    html: string;
    replyTo?: string;
    subject: string;
    text: string;
  }> {
    if (!this.templateProvider) return { ...input.fallback };
    const settings = await this.templateProvider.getEmailTemplateSettings();
    const rendered = renderConfiguredEmailTemplate({
      actionUrl: input.actionUrl,
      brand: {
        accentColor: settings.brand.accentColor,
        brandName: settings.brand.brandName,
        fromAddress: settings.sender.fromAddress,
        logoImageUrl: settings.brand.logoImageUrl,
        logoText: settings.brand.logoText,
        primaryColor: settings.brand.primaryColor,
        supportEmail: settings.sender.supportEmail,
      },
      template: settings.emailTemplates[templateKey],
      variables: input.variables,
    });
    return {
      ...rendered,
      replyTo: settings.sender.replyToAddress,
    };
  }

  private async send(options: EmailOptions): Promise<void> {
    if (!this.transport) {
      this.logger.log(
        `[EMAIL] To: ${options.to} | Subject: ${options.subject}`,
      );
      this.logger.log(`[EMAIL] Text: ${options.text}`);
      await this.recordDelivery({
        messageType: options.messageType,
        provider: "console",
        recipientEmail: options.to,
        status: "console_fallback",
        subject: options.subject,
      });
      return;
    }

    try {
      const { data, error } = await this.transport.send({
        from: this.fromAddress,
        ...(options.replyTo ? { replyTo: options.replyTo } : {}),
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        await this.recordDelivery({
          failureReason: error.message ?? "Provider rejected the message.",
          messageType: options.messageType,
          provider: "resend",
          recipientEmail: options.to,
          status: "failed",
          subject: options.subject,
        });
        this.logger.error("[email] Provider rejected message.", {
          error: error.message,
          subject: options.subject,
          to: options.to,
        });
        throw emailDeliveryError();
      }
      await this.recordDelivery({
        messageType: options.messageType,
        provider: "resend",
        providerMessageId: data?.id ?? null,
        recipientEmail: options.to,
        status: "sent",
        subject: options.subject,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      await this.recordDelivery({
        failureReason: error instanceof Error ? error.message : String(error),
        messageType: options.messageType,
        provider: "resend",
        recipientEmail: options.to,
        status: "failed",
        subject: options.subject,
      });
      this.logger.error("[email] Provider request failed.", {
        error: error instanceof Error ? error.message : String(error),
        subject: options.subject,
        to: options.to,
      });
      throw emailDeliveryError();
    }
  }

  private async recordDelivery(
    input: Omit<
      Parameters<EmailDeliveryRecorder["recordAttempt"]>[0],
      "createdAt"
    >,
  ): Promise<void> {
    if (!this.deliveryRecorder) return;
    try {
      await this.deliveryRecorder.recordAttempt({
        ...input,
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.error("[email] Failed to record delivery attempt.", {
        error: error instanceof Error ? error.message : String(error),
        messageType: input.messageType,
        provider: input.provider,
        status: input.status,
        to: input.recipientEmail,
      });
    }
  }
}
