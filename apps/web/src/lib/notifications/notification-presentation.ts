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

export function getNotificationActorLabel(notification: NotificationListItem) {
  return `By ${toHumanLabel(notification.actorUserSlug)}`;
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

function getSupplierContactNotificationPresentation(
  notification: NotificationListItem,
) {
  const supplierName = getPayloadString(notification, "supplierName");
  const contactName = getPayloadString(notification, "contactName");
  const contactEmail = getPayloadString(notification, "contactEmail");
  const linkedUserSlug =
    getPayloadString(notification, "linkedUserSlug") ??
    getPayloadString(notification, "invitedUserSlug") ??
    getPayloadString(notification, "previousUserSlug");
  const deliveryStatus = getPayloadString(notification, "deliveryStatus");

  const contactSummary = [
    contactName,
    contactEmail ? `(${contactEmail})` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const supplierSummary = supplierName ? ` for ${supplierName}` : "";

  switch (notification.eventType) {
    case "supplier.portal.linked":
      return {
        detail: `${getNotificationActorLabel(notification)} linked ${contactSummary || "this contact"}${supplierSummary}${linkedUserSlug ? ` to ${toHumanLabel(linkedUserSlug)}` : ""}.`,
        title: notification.summary,
      };
    case "supplier.portal.invited":
      return {
        detail: `${getNotificationActorLabel(notification)} sent a supplier portal invite to ${contactSummary || "this contact"}${supplierSummary}${deliveryStatus ? ` (${deliveryStatus})` : ""}.`,
        title: notification.summary,
      };
    case "supplier.portal.unlinked":
      return {
        detail: `${getNotificationActorLabel(notification)} removed portal access for ${contactSummary || "this contact"}${supplierSummary}${linkedUserSlug ? ` from ${toHumanLabel(linkedUserSlug)}` : ""}.`,
        title: notification.summary,
      };
    default:
      return {
        detail: notification.summary,
        title: `Supplier contact ${notification.resource.reference} was updated`,
      };
  }
}

function getSupplierProductNotificationPresentation(
  notification: NotificationListItem,
) {
  const supplierName = getPayloadString(notification, "supplierName");
  const productName = getPayloadString(notification, "productName");
  const productSlug = getPayloadString(notification, "productSlug");
  const brandName = getPayloadString(notification, "brandName");
  const categoryName = getPayloadString(notification, "categoryName");
  const variantCount = getPayloadNumber(notification, "variantCount");
  const preferred = notification.payload.isPreferred === true;
  const productSummary = productName
    ? `${productName}${productSlug ? ` (${productSlug})` : ""}`
    : notification.resource.reference;
  const productContext = formatSupplierProductContext(categoryName, brandName);
  const variantSummary =
    variantCount == null
      ? ""
      : ` with ${variantCount} variant${variantCount === 1 ? "" : "s"}`;
  const preferredSummary = preferred ? " as preferred supplier" : "";

  switch (notification.eventType) {
    case "supplier.product.linked":
      return {
        detail: `${getNotificationActorLabel(notification)} linked ${productSummary}${supplierName ? ` to ${supplierName}` : ""}${productContext}${variantSummary}${preferredSummary}.`,
        title: notification.summary,
      };
    case "supplier.product.unlinked":
      return {
        detail: `${getNotificationActorLabel(notification)} removed ${productSummary}${supplierName ? ` from ${supplierName}` : ""}${productContext}.`,
        title: notification.summary,
      };
    default:
      return {
        detail: notification.summary,
        title: `Supplier product ${notification.resource.reference} was updated`,
      };
  }
}

function getSupplierProcurementNotificationPresentation(
  notification: NotificationListItem,
) {
  const supplierName = getPayloadString(notification, "supplierName");
  const destinationLocationName = getPayloadString(
    notification,
    "destinationLocationName",
  );
  const requested = getPayloadNumber(notification, "totalRequestedQuantity");
  const approved = getPayloadNumber(notification, "totalApprovedQuantity");
  const received = getPayloadNumber(notification, "totalReceivedQuantity");
  const lineCount = getPayloadNumber(notification, "lineCount");
  const status = getPayloadString(notification, "status");
  const destination = destinationLocationName
    ? ` to ${destinationLocationName}`
    : "";

  switch (notification.eventType) {
    case "supplier.procurement.created":
      return {
        detail: `${getNotificationActorLabel(notification)} created this purchase order${supplierName ? ` for ${supplierName}` : ""}${destination}${formatSupplierProcurementCounts(lineCount, requested, "requested")}.`,
        title: notification.summary,
      };
    case "supplier.procurement.status_updated":
      return {
        detail: `${getNotificationActorLabel(notification)} marked this purchase order as ${formatSupplierProcurementStatus(status)}${destination}${formatSupplierProcurementCounts(lineCount, approved ?? requested, "approved")}.`,
        title: notification.summary,
      };
    case "supplier.procurement.received":
      return {
        detail: `${getNotificationActorLabel(notification)} recorded goods receipt${supplierName ? ` for ${supplierName}` : ""}${destination}${formatSupplierProcurementCounts(lineCount, received, "received")} (${formatSupplierProcurementStatus(status)}).`,
        title: notification.summary,
      };
    default:
      return {
        detail: notification.summary,
        title: `Purchase order ${notification.resource.reference} was updated`,
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

function formatSupplierProductContext(
  categoryName: string | null,
  brandName: string | null,
) {
  const parts = [categoryName, brandName].filter(Boolean);
  return parts.length > 0 ? ` in ${parts.join(" / ")}` : "";
}

function formatSupplierProcurementCounts(
  lineCount: number | null,
  quantity: number | null,
  label: "approved" | "received" | "requested",
) {
  const parts = [];
  if (lineCount != null) {
    parts.push(`${lineCount} line${lineCount === 1 ? "" : "s"}`);
  }
  if (quantity != null) {
    parts.push(`${quantity} ${label} unit${quantity === 1 ? "" : "s"}`);
  }
  return parts.length > 0 ? ` with ${parts.join(" and ")}` : "";
}

function formatSupplierProcurementStatus(status: string | null) {
  const labels: Record<string, string> = {
    approved: "approved",
    cancelled: "cancelled",
    closed: "closed",
    draft: "saved as draft",
    ordered: "sent to supplier",
    partially_received: "partially received",
    received: "fully received",
    submitted: "submitted for approval",
  };
  return status ? (labels[status] ?? toHumanLabel(status)) : "updated";
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
