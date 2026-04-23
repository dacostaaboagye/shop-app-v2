import { z } from "zod";

export const emailDeliveryStatusSchema = z.enum([
  "bounced",
  "complained",
  "console_fallback",
  "delayed",
  "delivered",
  "failed",
  "sent",
  "suppressed",
]);

export const emailOperationsModeSchema = z.enum([
  "console_fallback",
  "live_send",
]);

export const emailDeliveryAttemptResponseSchema = z.object({
  createdAt: z.iso.datetime(),
  failureReason: z.string().nullable(),
  messageType: z.string(),
  provider: z.string(),
  providerMessageId: z.string().nullable(),
  recipientEmail: z.string().email(),
  status: emailDeliveryStatusSchema,
  statusRecordedAt: z.iso.datetime(),
  subject: z.string(),
});

export const emailOperationsResponseSchema = z.object({
  fromAddress: z.string(),
  generatedAt: z.iso.datetime(),
  mode: emailOperationsModeSchema,
  providerConfigured: z.boolean(),
  recentAttempts: z.array(emailDeliveryAttemptResponseSchema),
  replyToAddress: z.string().email(),
  supportEmail: z.string().email(),
});

export const sendTestEmailRequestSchema = z.object({
  targetEmail: z.string().trim().email().max(320),
});

export const sendTestEmailResponseSchema = z.object({
  ok: z.literal(true),
});

export type EmailOperationsResponse = z.infer<
  typeof emailOperationsResponseSchema
>;
export type SendTestEmailRequest = z.infer<typeof sendTestEmailRequestSchema>;
