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
      return "Needs review";
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
      return toHumanLabel(eventType);
  }
}

export function getNotificationActorLabel(notification: NotificationListItem) {
  return `By ${toHumanLabel(notification.actorUserSlug)}`;
}

export function getNotificationPresentation(
  notification: NotificationListItem,
) {
  if (notification.resource.kind === "stock_transfer_request") {
    return getTransferNotificationPresentation(notification);
  }

  return {
    detail: `${getNotificationActorLabel(notification)} updated ${toHumanLabel(
      notification.resource.kind,
    )} ${notification.resource.reference}.`,
    title: notification.summary,
  };
}

function getTransferNotificationPresentation(
  notification: NotificationListItem,
) {
  const reference = notification.resource.reference;
  const source = getPayloadString(notification, "sourceLocationName");
  const destination = getPayloadString(notification, "destinationLocationName");
  const requested = getPayloadNumber(notification, "requestedQuantity");
  const approved = getPayloadNumber(notification, "approvedQuantity");
  const gtnReference = getPayloadString(notification, "gtnReference");
  const quantity = approved ?? requested;
  const route = formatTransferRoute(source, destination);

  switch (notification.eventType) {
    case "transfer.requested":
      return {
        detail: `${getNotificationActorLabel(notification)} requested ${formatQuantity(
          requested,
        )}${route}.`,
        title: `Supply request ${reference} needs review`,
      };
    case "transfer.approved":
      return {
        detail: `${getNotificationActorLabel(notification)} approved ${formatQuantity(
          quantity,
        )}${route}.`,
        title: `Supply request ${reference} was approved`,
      };
    case "transfer.rejected":
      return {
        detail: `${getNotificationActorLabel(notification)} rejected this request${route}.`,
        title: `Supply request ${reference} was rejected`,
      };
    case "transfer.dispatched":
      return {
        detail: `${getNotificationActorLabel(notification)} dispatched ${formatQuantity(
          quantity,
        )}${route}${gtnReference ? ` under GTN ${gtnReference}` : ""}.`,
        title: `Supply request ${reference} is in transit`,
      };
    case "transfer.received":
      return {
        detail: `${getNotificationActorLabel(notification)} confirmed receipt${route}${
          gtnReference ? ` for GTN ${gtnReference}` : ""
        }.`,
        title: `Supply request ${reference} was received`,
      };
    case "transfer.cancelled":
      return {
        detail: `${getNotificationActorLabel(notification)} cancelled this request${route}.`,
        title: `Supply request ${reference} was cancelled`,
      };
    default:
      return {
        detail: notification.summary,
        title: `Supply request ${reference} was updated`,
      };
  }
}

function formatTransferRoute(
  source: string | null,
  destination: string | null,
) {
  if (source && destination) return ` from ${source} to ${destination}`;
  if (source) return ` from ${source}`;
  if (destination) return ` to ${destination}`;
  return "";
}

function formatQuantity(quantity: number | null) {
  return quantity == null
    ? "stock"
    : `${quantity} unit${quantity === 1 ? "" : "s"}`;
}

function getPayloadString(
  notification: NotificationListItem,
  key: string,
): string | null {
  const value = notification.payload[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getPayloadNumber(
  notification: NotificationListItem,
  key: string,
): number | null {
  const value = notification.payload[key];
  return typeof value === "number" ? value : null;
}

function toHumanLabel(value: string) {
  const label = value.replace(/[._-]+/g, " ").trim();
  return label.replace(/\b\w/g, (match) => match.toUpperCase());
}
