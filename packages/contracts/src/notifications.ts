import { z } from "zod";

export const notificationStatusSchema = z.enum(["unread", "read"]);

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const notificationResourceSchema = z.object({
  kind: z.string().min(1).max(80),
  reference: z.string().min(1).max(120),
});

export const notificationPayloadValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const notificationListItemSchema = z.object({
  actorUserSlug: z.string().min(1).max(120),
  eventType: z.string().min(1).max(120),
  notificationKey: z.string().uuid(),
  occurredAt: z.iso.datetime(),
  payload: z.record(z.string(), notificationPayloadValueSchema).default({}),
  readAt: z.iso.datetime().nullable(),
  resource: notificationResourceSchema,
  status: notificationStatusSchema,
  summary: z.string().min(1),
});

export const notificationListResponseSchema = z.object({
  items: z.array(notificationListItemSchema).default([]),
  unreadCount: z.number().int().min(0),
});

export const markNotificationReadResponseSchema = z.object({
  notificationKey: z.string().uuid(),
  readAt: z.iso.datetime().nullable(),
  status: notificationStatusSchema,
});

export const markAllNotificationsReadResponseSchema = z.object({
  updatedCount: z.number().int().min(0),
});

export type MarkAllNotificationsReadResponse = z.infer<
  typeof markAllNotificationsReadResponseSchema
>;
export type MarkNotificationReadResponse = z.infer<
  typeof markNotificationReadResponseSchema
>;
export type NotificationListItem = z.infer<typeof notificationListItemSchema>;
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
export type NotificationListResponse = z.infer<
  typeof notificationListResponseSchema
>;
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;
