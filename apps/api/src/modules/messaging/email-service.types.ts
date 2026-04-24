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

export type EmailMessageType =
  | "email_test"
  | "email_verification"
  | "password_reset"
  | "supplier_invite";

export type EmailOptions = {
  messageType: EmailMessageType;
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
    messageType: EmailMessageType;
    provider: "console" | "resend";
    providerMessageId?: string | null;
    recipientEmail: string;
    status: EmailDeliveryStatus;
    subject: string;
  }): Promise<{ attemptId: string | null }>;
};

export type EmailSendResult = {
  attemptId: string | null;
  failureReason?: string | null;
  providerMessageId?: string | null;
  status: EmailDeliveryStatus;
};

export type EmailTemplateProvider = {
  getEmailTemplateSettings: () => Promise<ResolvedEmailConfiguration>;
};

export type EmailDeliveryPolicy = {
  assertCanSend(recipientEmail: string): Promise<void>;
};

export type EmailServiceOptions = {
  allowConsoleFallback?: boolean;
  deliveryPolicy?: EmailDeliveryPolicy;
  deliveryRecorder?: EmailDeliveryRecorder | null;
  logger?: Pick<Console, "error" | "log">;
  templateProvider?: EmailTemplateProvider;
  transport?: EmailTransport | null;
  webBaseUrl?: string;
};
