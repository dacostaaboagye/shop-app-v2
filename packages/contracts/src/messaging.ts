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

export const adminCommunicationAudienceSchema = z.object({
  locationId: z.string().uuid().optional(),
  permission: z.string().trim().min(1).max(120),
});

export const adminCommunicationDirectRecipientSchema = z.object({
  userSlug: z.string().trim().min(1).max(120),
});

export const adminCommunicationTargetSchema = z.discriminatedUnion("kind", [
  z.object({
    audience: adminCommunicationAudienceSchema,
    kind: z.literal("audience"),
  }),
  z.object({
    kind: z.literal("user"),
    recipient: adminCommunicationDirectRecipientSchema,
  }),
]);

export const sendAdminCommunicationRequestSchema = z
  .object({
    messageBody: z.string().trim().min(1).max(4000),
    sendEmail: z.boolean().default(false),
    sendNotification: z.boolean().default(true),
    subject: z.string().trim().min(1).max(160),
    target: adminCommunicationTargetSchema,
  })
  .superRefine((value, context) => {
    if (value.sendEmail || value.sendNotification) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select at least one delivery channel.",
      path: ["sendNotification"],
    });
  });

export const sendAdminCommunicationResponseSchema = z.object({
  emailRecipientCount: z.number().int().min(0),
  notificationRecipientCount: z.number().int().min(0),
  ok: z.literal(true),
  totalRecipientCount: z.number().int().min(0),
});

export const adminSentCommunicationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(160).default(""),
});

export const adminSentCommunicationEntrySchema = z.object({
  actorUserSlug: z.string().min(1).max(120),
  deliveryStatus: z.enum(["pending", "processing", "delivered", "failed"]),
  eventId: z.string().uuid(),
  messageBody: z.string().min(1),
  occurredAt: z.iso.datetime(),
  recipientLabel: z.string().min(1),
  sendEmail: z.boolean(),
  sendNotification: z.boolean(),
  subject: z.string().min(1).max(160),
});

export const adminSentCommunicationListResponseSchema = z.object({
  items: z.array(adminSentCommunicationEntrySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export const blockedEmailDeliveryStatusSchema = z.enum([
  "bounced",
  "complained",
  "suppressed",
]);

export const emailRecipientStateQuerySchema = z.object({
  email: z.string().trim().email().max(320),
});

export const emailRecipientStateResponseSchema = z.object({
  canSend: z.boolean(),
  occurredAt: z.iso.datetime().nullable(),
  recipientEmail: z.string().email(),
  status: blockedEmailDeliveryStatusSchema.nullable(),
  statusReason: z.string().nullable(),
  summary: z.string().min(1),
});

export const emailHealthResponseSchema = z.object({
  generatedAt: z.iso.datetime(),
  windowDays: z.number().int().min(1),
  totalAttempts: z.number().int().min(0),
  totalSent: z.number().int().min(0),
  totalDelivered: z.number().int().min(0),
  totalBounced: z.number().int().min(0),
  totalComplained: z.number().int().min(0),
  totalSuppressed: z.number().int().min(0),
  totalFailed: z.number().int().min(0),
  // Sent + delivered out of attempted, expressed as 0-1. Null when there
  // are no attempts in the window (no signal yet).
  deliveryRate: z.number().min(0).max(1).nullable(),
  providerConfigured: z.boolean(),
});

export type EmailOperationsResponse = z.infer<
  typeof emailOperationsResponseSchema
>;
export type SendTestEmailRequest = z.infer<typeof sendTestEmailRequestSchema>;
export type SendAdminCommunicationRequest = z.infer<
  typeof sendAdminCommunicationRequestSchema
>;
export type AdminCommunicationTarget = z.infer<
  typeof adminCommunicationTargetSchema
>;
export type AdminSentCommunicationListQuery = z.infer<
  typeof adminSentCommunicationListQuerySchema
>;
export type AdminSentCommunicationListResponse = z.infer<
  typeof adminSentCommunicationListResponseSchema
>;
export type SendAdminCommunicationResponse = z.infer<
  typeof sendAdminCommunicationResponseSchema
>;
export type BlockedEmailDeliveryStatus = z.infer<
  typeof blockedEmailDeliveryStatusSchema
>;
export type EmailRecipientStateResponse = z.infer<
  typeof emailRecipientStateResponseSchema
>;
export type EmailHealthResponse = z.infer<typeof emailHealthResponseSchema>;
