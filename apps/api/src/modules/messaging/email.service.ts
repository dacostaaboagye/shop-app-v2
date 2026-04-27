import type { EmailTemplateSettings } from "@shop/database";
import { Resend } from "resend";
import { assertValidFromAddress } from "./email-errors.js";
import { EmailSendExecution } from "./email-send-execution.js";
import type {
  EmailSendResult,
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
  private readonly deliveryPolicy:
    | NonNullable<EmailServiceOptions["deliveryPolicy"]>
    | undefined;
  private readonly execution: EmailSendExecution;
  private readonly fromAddress: string;
  private readonly templateProvider:
    | NonNullable<EmailServiceOptions["templateProvider"]>
    | undefined;
  private readonly webBaseUrl: string;

  constructor(
    readonly apiKey: string | undefined,
    fromAddress: string,
    options: EmailServiceOptions = {},
  ) {
    assertValidFromAddress(fromAddress);
    this.deliveryPolicy = options.deliveryPolicy;
    this.fromAddress = fromAddress;
    this.templateProvider = options.templateProvider;
    this.webBaseUrl = options.webBaseUrl ?? "https://app.example.com";

    const transport: EmailTransport | null =
      options.transport ??
      (apiKey
        ? (new Resend(apiKey).emails as unknown as EmailTransport)
        : null);

    const allowConsoleFallback = options.allowConsoleFallback ?? true;

    if (!transport && !allowConsoleFallback) {
      throw new Error("RESEND_API_KEY must be configured for email delivery.");
    }

    this.execution = new EmailSendExecution({
      allowConsoleFallback,
      deliveryRecorder: options.deliveryRecorder ?? null,
      fromAddress,
      logger: options.logger ?? console,
      transport,
      ...(options.eventPublisher
        ? { eventPublisher: options.eventPublisher }
        : {}),
    });
  }

  async sendVerificationEmail(input: {
    to: string;
    firstName: string;
    verificationUrl: string;
  }): Promise<EmailSendResult> {
    await this.assertCanSend(input.to);
    const configured = await this.resolveTemplate("emailVerification", {
      actionUrl: input.verificationUrl,
      fallback: {
        html: verificationEmailHtml(input.firstName, input.verificationUrl),
        subject: "Verify your email address",
        text: verificationEmailText(input.firstName, input.verificationUrl),
      },
      variables: { firstName: input.firstName },
    });
    return this.execution.send({
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
  }): Promise<EmailSendResult> {
    await this.assertCanSend(input.to);
    const configured = await this.resolveTemplate("passwordReset", {
      actionUrl: input.resetUrl,
      fallback: {
        html: passwordResetEmailHtml(input.firstName, input.resetUrl),
        subject: "Reset your password",
        text: passwordResetEmailText(input.firstName, input.resetUrl),
      },
      variables: { firstName: input.firstName },
    });
    return this.execution.send({
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
  }): Promise<EmailSendResult> {
    await this.assertCanSend(input.to);
    const configured = await this.resolveTemplate("supplierInvite", {
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
    return this.execution.send({
      messageType: "supplier_invite",
      ...(configured.replyTo ? { replyTo: configured.replyTo } : {}),
      to: input.to,
      subject: configured.subject,
      html: configured.html,
      text: configured.text,
    });
  }

  async sendTestEmail(input: { to: string }): Promise<EmailSendResult> {
    await this.assertCanSend(input.to);
    const testUrl = `${this.webBaseUrl}/`;
    const configured = await this.resolveTemplate("emailVerification", {
      actionUrl: testUrl,
      fallback: {
        html: verificationEmailHtml("Operator", testUrl),
        subject: "Email delivery test",
        text: verificationEmailText("Operator", testUrl),
      },
      variables: { firstName: "Operator" },
    });
    return this.execution.send({
      messageType: "email_test",
      ...(configured.replyTo ? { replyTo: configured.replyTo } : {}),
      to: input.to,
      subject: `[Test] ${configured.subject}`,
      html: configured.html,
      text: configured.text,
    });
  }

  async sendOperationalEmail(input: {
    firstName?: string | null;
    subject: string;
    to: string;
    messageBody: string;
  }): Promise<EmailSendResult> {
    await this.assertCanSend(input.to);
    const greeting = input.firstName?.trim()
      ? `Hi ${input.firstName.trim()},`
      : "Hello,";
    const html = [
      "<!DOCTYPE html>",
      '<html><body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">',
      `<p>${escapeHtml(greeting)}</p>`,
      ...input.messageBody
        .trim()
        .split(/\r?\n\r?\n/)
        .map(
          (paragraph) =>
            `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`,
        ),
      `<p>Reply to this email if you need help.</p>`,
      "</body></html>",
    ].join("");
    const text = [
      greeting,
      "",
      input.messageBody.trim(),
      "",
      "Reply to this email if you need help.",
    ].join("\n");

    return this.execution.send({
      messageType: "admin_operational",
      to: input.to,
      subject: input.subject,
      html,
      text,
    });
  }

  async sendSalesDocumentEmail(input: {
    attachment: {
      content: Buffer;
      contentType: string;
      filename: string;
    };
    documentLabel: string;
    documentReference: string;
    locationName?: string | null;
    profileEmail?: string | null;
    recipientName?: string | null;
    to: string;
  }): Promise<EmailSendResult> {
    await this.assertCanSend(input.to);
    const greeting = input.recipientName?.trim()
      ? `Hi ${input.recipientName.trim()},`
      : "Hello,";
    const subject = `${input.documentLabel} ${input.documentReference}`;
    const supportEmail = input.profileEmail?.trim() || this.fromAddress;
    const locationLine = input.locationName?.trim()
      ? ` from ${input.locationName.trim()}`
      : "";
    const html = [
      "<!DOCTYPE html>",
      '<html><body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">',
      `<p>${escapeHtml(greeting)}</p>`,
      `<p>Your ${escapeHtml(input.documentLabel.toLowerCase())} for ${escapeHtml(input.documentReference)}${escapeHtml(locationLine)} is attached as a PDF.</p>`,
      "<p>If you need help with this document, reply to this email.</p>",
      `<p>Support: ${escapeHtml(supportEmail)}</p>`,
      "</body></html>",
    ].join("");
    const text = [
      greeting,
      "",
      `Your ${input.documentLabel.toLowerCase()} for ${input.documentReference}${locationLine} is attached as a PDF.`,
      "If you need help with this document, reply to this email.",
      `Support: ${supportEmail}`,
    ].join("\n");

    return this.execution.send({
      attachments: [
        {
          content: input.attachment.content,
          contentType: input.attachment.contentType,
          filename: input.attachment.filename,
        },
      ],
      messageType: "sales_document",
      to: input.to,
      subject,
      html,
      text,
    });
  }

  private async resolveTemplate(
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
    return { ...rendered, replyTo: settings.sender.replyToAddress };
  }

  private async assertCanSend(recipientEmail: string): Promise<void> {
    await this.deliveryPolicy?.assertCanSend(recipientEmail);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
