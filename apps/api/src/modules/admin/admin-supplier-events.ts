import { randomUUID } from "node:crypto";
import type { PlatformEventRecord } from "../events/platform-event.types.js";

type SupplierPortalActor = {
  userSlug: string;
};

export type SupplierPortalContactEventContext = {
  contactEmail: string | null;
  contactName: string;
  contactReference: string;
  supplierName: string;
  supplierSlug: string;
  userSlug: string | null;
};

export type SupplierProductEventContext = {
  brandName: string | null;
  categoryName: string | null;
  productName: string;
  productSlug: string;
  supplierName: string;
  supplierSlug: string;
  variantCount: number;
};

export type SupplierProcurementEventContext = {
  destinationLocationName: string | null;
  destinationLocationSlug: string | null;
  lineCount: number;
  notes: string | null;
  reference: string;
  status:
    | "draft"
    | "submitted"
    | "approved"
    | "ordered"
    | "partially_received"
    | "received"
    | "cancelled"
    | "closed";
  supplierName: string;
  supplierSlug: string;
  totalApprovedQuantity: number;
  totalReceivedQuantity: number;
  totalRequestedQuantity: number;
};

export function createSupplierPortalLinkedEvent(input: {
  actor: SupplierPortalActor;
  contact: SupplierPortalContactEventContext;
  linkedUserSlug: string;
  occurredAt: Date;
}): PlatformEventRecord {
  return createSupplierEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      contactEmail: input.contact.contactEmail,
      contactName: input.contact.contactName,
      contactReference: input.contact.contactReference,
      linkedUserSlug: input.linkedUserSlug,
      supplierName: input.contact.supplierName,
      supplierSlug: input.contact.supplierSlug,
    },
    reference: input.contact.contactReference,
    resourceKind: "supplier_contact",
    summary: `Supplier portal linked for ${input.contact.supplierName}: ${input.contact.contactName}${formatEmail(input.contact.contactEmail)} to ${input.linkedUserSlug}.`,
    type: "supplier.portal.linked",
  });
}

export function createSupplierPortalInvitedEvent(input: {
  actor: SupplierPortalActor;
  contact: SupplierPortalContactEventContext;
  deliveryStatus: string | null;
  invitedUserSlug: string | null;
  occurredAt: Date;
}): PlatformEventRecord {
  return createSupplierEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      contactEmail: input.contact.contactEmail,
      contactName: input.contact.contactName,
      contactReference: input.contact.contactReference,
      deliveryStatus: input.deliveryStatus,
      invitedUserSlug: input.invitedUserSlug,
      supplierName: input.contact.supplierName,
      supplierSlug: input.contact.supplierSlug,
    },
    reference: input.contact.contactReference,
    resourceKind: "supplier_contact",
    summary: `Supplier portal invite sent for ${input.contact.supplierName}: ${input.contact.contactName}${formatEmail(input.contact.contactEmail)}${input.deliveryStatus ? ` (${input.deliveryStatus})` : ""}.`,
    type: "supplier.portal.invited",
  });
}

export function createSupplierPortalUnlinkedEvent(input: {
  actor: SupplierPortalActor;
  contact: SupplierPortalContactEventContext;
  occurredAt: Date;
}): PlatformEventRecord {
  return createSupplierEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      contactEmail: input.contact.contactEmail,
      contactName: input.contact.contactName,
      contactReference: input.contact.contactReference,
      previousUserSlug: input.contact.userSlug,
      supplierName: input.contact.supplierName,
      supplierSlug: input.contact.supplierSlug,
    },
    reference: input.contact.contactReference,
    resourceKind: "supplier_contact",
    summary: `Supplier portal unlinked for ${input.contact.supplierName}: ${input.contact.contactName}${formatEmail(input.contact.contactEmail)}${input.contact.userSlug ? ` from ${input.contact.userSlug}` : ""}.`,
    type: "supplier.portal.unlinked",
  });
}

export function createSupplierProductLinkedEvent(input: {
  actor: SupplierPortalActor;
  context: SupplierProductEventContext;
  isPreferred: boolean;
  occurredAt: Date;
}): PlatformEventRecord {
  return createSupplierEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      brandName: input.context.brandName,
      categoryName: input.context.categoryName,
      isPreferred: input.isPreferred,
      productName: input.context.productName,
      productSlug: input.context.productSlug,
      supplierName: input.context.supplierName,
      supplierSlug: input.context.supplierSlug,
      variantCount: input.context.variantCount,
    },
    reference: `${input.context.supplierSlug}:${input.context.productSlug}`,
    resourceKind: "supplier_product_link",
    summary: `Supplier product linked for ${input.context.supplierName}: ${input.context.productName} (${input.context.productSlug})${formatProductContext(input.context)} with ${input.context.variantCount} variant${input.context.variantCount === 1 ? "" : "s"}.`,
    type: "supplier.product.linked",
  });
}

export function createSupplierProductUnlinkedEvent(input: {
  actor: SupplierPortalActor;
  context: SupplierProductEventContext;
  occurredAt: Date;
}): PlatformEventRecord {
  return createSupplierEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      brandName: input.context.brandName,
      categoryName: input.context.categoryName,
      productName: input.context.productName,
      productSlug: input.context.productSlug,
      supplierName: input.context.supplierName,
      supplierSlug: input.context.supplierSlug,
      variantCount: input.context.variantCount,
    },
    reference: `${input.context.supplierSlug}:${input.context.productSlug}`,
    resourceKind: "supplier_product_link",
    summary: `Supplier product unlinked for ${input.context.supplierName}: ${input.context.productName} (${input.context.productSlug})${formatProductContext(input.context)}.`,
    type: "supplier.product.unlinked",
  });
}

export function createSupplierProcurementCreatedEvent(input: {
  actor: SupplierPortalActor;
  context: SupplierProcurementEventContext;
  occurredAt: Date;
}): PlatformEventRecord {
  return createSupplierEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: procurementPayload(input.context),
    reference: input.context.reference,
    resourceKind: "supplier_procurement_order",
    summary: `Supplier purchase order created for ${input.context.supplierName}: ${input.context.reference}${formatDestination(input.context)} with ${input.context.lineCount} line${input.context.lineCount === 1 ? "" : "s"} and ${input.context.totalRequestedQuantity} requested unit${input.context.totalRequestedQuantity === 1 ? "" : "s"}.`,
    type: "supplier.procurement.created",
  });
}

export function createSupplierProcurementStatusUpdatedEvent(input: {
  actor: SupplierPortalActor;
  context: SupplierProcurementEventContext;
  occurredAt: Date;
}): PlatformEventRecord {
  return createSupplierEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: procurementPayload(input.context),
    reference: input.context.reference,
    resourceKind: "supplier_procurement_order",
    summary: `Supplier purchase order ${formatProcurementStatus(input.context.status)} for ${input.context.supplierName}: ${input.context.reference}${formatDestination(input.context)}.`,
    type: "supplier.procurement.status_updated",
  });
}

export function createSupplierProcurementReceivedEvent(input: {
  actor: SupplierPortalActor;
  context: SupplierProcurementEventContext;
  occurredAt: Date;
}): PlatformEventRecord {
  return createSupplierEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: procurementPayload(input.context),
    reference: input.context.reference,
    resourceKind: "supplier_procurement_order",
    summary: `Supplier goods receipt recorded for ${input.context.supplierName}: ${input.context.reference}${formatDestination(input.context)} at ${input.context.totalReceivedQuantity} received unit${input.context.totalReceivedQuantity === 1 ? "" : "s"} (${formatProcurementStatus(input.context.status)}).`,
    type: "supplier.procurement.received",
  });
}

function createSupplierEvent(input: {
  actor: SupplierPortalActor;
  occurredAt: Date;
  payload: Record<string, string | number | boolean | null>;
  reference: string;
  resourceKind: string;
  summary: string;
  type: string;
}): PlatformEventRecord {
  return {
    actor: { userSlug: input.actor.userSlug },
    audience: [
      { kind: "permission", permission: "suppliers.view" },
      { kind: "permission", permission: "admin.dashboard.view" },
    ],
    id: randomUUID(),
    occurredAt: input.occurredAt.toISOString(),
    payload: input.payload,
    resource: {
      kind: input.resourceKind,
      reference: input.reference,
    },
    summary: input.summary,
    type: input.type,
  };
}

function formatEmail(email: string | null) {
  return email ? ` (${email})` : "";
}

function formatProductContext(input: SupplierProductEventContext) {
  const parts = [input.categoryName, input.brandName].filter(Boolean);
  return parts.length > 0 ? ` in ${parts.join(" / ")}` : "";
}

function procurementPayload(input: SupplierProcurementEventContext) {
  return {
    destinationLocationName: input.destinationLocationName,
    destinationLocationSlug: input.destinationLocationSlug,
    lineCount: input.lineCount,
    notes: input.notes,
    reference: input.reference,
    status: input.status,
    supplierName: input.supplierName,
    supplierSlug: input.supplierSlug,
    totalApprovedQuantity: input.totalApprovedQuantity,
    totalReceivedQuantity: input.totalReceivedQuantity,
    totalRequestedQuantity: input.totalRequestedQuantity,
  };
}

function formatDestination(input: SupplierProcurementEventContext) {
  return input.destinationLocationName
    ? ` to ${input.destinationLocationName}`
    : "";
}

function formatProcurementStatus(
  status: SupplierProcurementEventContext["status"],
) {
  const labels: Record<SupplierProcurementEventContext["status"], string> = {
    approved: "approved",
    cancelled: "cancelled",
    closed: "closed",
    draft: "saved as draft",
    ordered: "sent to supplier",
    partially_received: "partially received",
    received: "fully received",
    submitted: "submitted for approval",
  };
  return labels[status];
}
