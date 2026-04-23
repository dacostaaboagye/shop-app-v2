import type { ResolvedEmailConfiguration } from "./email-configuration.js";

export type EmailDeliveryStatus =
  | "bounced"
  | "complained"
  | "console_fallback"
  | "delayed"
  | "delivered"
  | "failed"
  | "sent"
  | "suppressed";

export type EmailOptions = {
  messageType: "email_verification" | "password_reset" | "supplier_invite";
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  text: string;
};

export type EmailTransport = {
  send(
    options: Omit<EmailOptions, "messageType"> & {
      from: string;
      replyTo?: string;
    },
  ): Promise<{
    data?: { id?: string } | null;
    error?: { message?: string } | null;
  }>;
};

export type EmailDeliveryRecorder = {
  recordAttempt(input: {
    createdAt: Date;
    failureReason?: string | null;
    messageType: EmailOptions["messageType"];
    provider: "console" | "resend";
    providerMessageId?: string | null;
    recipientEmail: string;
    status: EmailDeliveryStatus;
    subject: string;
  }): Promise<void>;
};

export type EmailTemplateProvider = {
  getEmailTemplateSettings: () => Promise<ResolvedEmailConfiguration>;
};

export type EmailServiceOptions = {
  allowConsoleFallback?: boolean;
  deliveryRecorder?: EmailDeliveryRecorder | null;
  logger?: Pick<Console, "error" | "log">;
  templateProvider?: EmailTemplateProvider;
  transport?: EmailTransport | null;
};
