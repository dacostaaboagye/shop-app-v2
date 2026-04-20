import type { NotificationListItem } from "@shop/contracts";

const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

export function formatNotificationTimeLabel(
  occurredAt: string,
  now = new Date(),
) {
  const diffMs = new Date(occurredAt).getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormat.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormat.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return relativeTimeFormat.format(diffDays, "day");
}

export function getNotificationEventLabel(eventType: string) {
  switch (eventType) {
    case "transfer.requested":
      return "Requested";
    case "transfer.approved":
      return "Approved";
    case "transfer.rejected":
      return "Rejected";
    case "transfer.dispatched":
      return "In transit";
    case "transfer.received":
      return "Received";
    case "transfer.cancelled":
      return "Cancelled";
    default:
      return eventType;
  }
}

export function getNotificationActorLabel(notification: NotificationListItem) {
  return `By ${notification.actorUserSlug}`;
}
