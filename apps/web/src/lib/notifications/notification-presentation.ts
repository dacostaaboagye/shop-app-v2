import type { NotificationListItem } from "@shop/contracts";
import {
  getNotificationActorLabel,
  getPayloadString,
  getSupplierContactNotificationPresentation,
  getSupplierProcurementNotificationPresentation,
  getSupplierProductNotificationPresentation,
  getTransferNotificationPresentation,
} from "./notification-presentation.support";

export { getNotificationActorLabel } from "./notification-presentation.support";

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
    case "supplier.portal.linked":
      return "Portal linked";
    case "supplier.portal.invited":
      return "Invite sent";
    case "supplier.portal.unlinked":
      return "Portal unlinked";
    case "supplier.product.linked":
      return "Product linked";
    case "supplier.product.unlinked":
      return "Product unlinked";
    case "supplier.procurement.created":
      return "Purchase order created";
    case "supplier.procurement.status_updated":
      return "Purchase order updated";
    case "supplier.procurement.received":
      return "Goods received";
    default:
      return toHumanLabel(eventType);
  }
}

export function getNotificationStatusLabel(
  status: NotificationListItem["status"],
) {
  switch (status) {
    case "unread":
      return "Needs Attention";
    case "read":
      return "Read";
  }
}

export function getNotificationPresentation(
  notification: NotificationListItem,
) {
  if (notification.resource.kind === "admin_communication") {
    return getAdminCommunicationNotificationPresentation(notification);
  }

  if (notification.resource.kind === "stock_transfer_request") {
    return getTransferNotificationPresentation(notification);
  }

  if (notification.resource.kind === "supplier_contact") {
    return getSupplierContactNotificationPresentation(notification);
  }

  if (notification.resource.kind === "supplier_product_link") {
    return getSupplierProductNotificationPresentation(notification);
  }

  if (notification.resource.kind === "supplier_procurement_order") {
    return getSupplierProcurementNotificationPresentation(notification);
  }

  return {
    detail:
      getPayloadString(notification, "messageBody") ??
      `${getNotificationActorLabel(notification)} updated ${toHumanLabel(
        notification.resource.kind,
      )} ${notification.resource.reference}.`,
    title: notification.summary,
  };
}

function getAdminCommunicationNotificationPresentation(
  notification: NotificationListItem,
) {
  return {
    detail:
      getPayloadString(notification, "messageBody") ??
      `${getNotificationActorLabel(notification)} sent an operational update.`,
    title: notification.summary,
  };
}

function toHumanLabel(value: string) {
  const label = value.replace(/[._-]+/g, " ").trim();
  return label.replace(/\b\w/g, (match) => match.toUpperCase());
}
