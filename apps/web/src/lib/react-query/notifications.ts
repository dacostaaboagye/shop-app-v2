import type {
  AdminSentCommunicationListQuery,
  AdminSentCommunicationListResponse,
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  NotificationListResponse,
  SendAdminCommunicationRequest,
  SendAdminCommunicationResponse,
} from "@shop/contracts";
import type { QueryKey } from "@tanstack/react-query";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const notificationsQueryKeyPrefix = [
  "notifications",
] as const satisfies QueryKey;

export const notificationsQueryKey = (limit = 12) =>
  [
    ...notificationsQueryKeyPrefix,
    "list",
    { limit },
  ] as const satisfies QueryKey;

export const adminSentCommunicationsQueryKey = (
  query: AdminSentCommunicationListQuery,
) => ["admin", "notifications", "sent", query] as const;

export async function fetchNotifications(
  limit = 12,
): Promise<NotificationListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });

  return fetchJson<NotificationListResponse>(
    `/api/notifications?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function patchNotificationRead(
  notificationKey: string,
): Promise<MarkNotificationReadResponse> {
  return fetchJson<MarkNotificationReadResponse>(
    `/api/notifications/${encodeURIComponent(notificationKey)}/read`,
    { method: "PATCH" },
    { auth: "required" },
  );
}

export async function patchAllNotificationsRead(): Promise<MarkAllNotificationsReadResponse> {
  return fetchJson<MarkAllNotificationsReadResponse>(
    "/api/notifications/read-all",
    { method: "PATCH" },
    { auth: "required" },
  );
}

export async function deleteNotification(
  notificationKey: string,
): Promise<void> {
  return fetchJson<void>(
    `/api/notifications/${encodeURIComponent(notificationKey)}`,
    { method: "DELETE" },
    { auth: "required" },
  );
}

export async function postAdminNotificationCompose(
  body: SendAdminCommunicationRequest,
): Promise<SendAdminCommunicationResponse> {
  return fetchJson<SendAdminCommunicationResponse>(
    "/api/admin/notifications/compose",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function fetchAdminSentCommunications(
  query: AdminSentCommunicationListQuery,
): Promise<AdminSentCommunicationListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  params.set("q", query.q);

  return fetchJson<AdminSentCommunicationListResponse>(
    `/api/admin/notifications/sent?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}
