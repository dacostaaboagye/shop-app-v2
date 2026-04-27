import type {
  AdminLinkSupplierContactPortalRequest,
  AdminSupplierDetail,
} from "@shop/contracts";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import {
  createSupplierPortalInvitedEvent,
  createSupplierPortalLinkedEvent,
  createSupplierPortalUnlinkedEvent,
  createSupplierProcurementCreatedEvent,
  createSupplierProcurementReceivedEvent,
  createSupplierProcurementStatusUpdatedEvent,
  createSupplierProductLinkedEvent,
  createSupplierProductUnlinkedEvent,
  type SupplierPortalContactEventContext,
  type SupplierProductEventContext,
} from "./admin-supplier-events.js";
import {
  findSupplierContact,
  findSupplierProcurementOrder,
  findSupplierProduct,
  toSupplierProcurementEventContext,
} from "./admin-supplier-write.support.js";

type SupplierActor = { userId: string; userSlug: string };

export async function publishSupplierPortalLinked(input: {
  actor: SupplierActor;
  contact: SupplierPortalContactEventContext | null;
  eventPublisher?: PlatformEventPublisher | null | undefined;
  now: Date;
  payload: AdminLinkSupplierContactPortalRequest;
  supplier: AdminSupplierDetail | null;
}) {
  if (!input.contact || !input.supplier) return;
  await input.eventPublisher?.publish(
    createSupplierPortalLinkedEvent({
      actor: input.actor,
      contact: input.contact,
      linkedUserSlug: input.payload.userSlug,
      occurredAt: input.now,
    }),
  );
}

export async function publishSupplierPortalInvited(input: {
  actor: SupplierActor;
  contact: SupplierPortalContactEventContext | null;
  contactReference: string;
  eventPublisher?: PlatformEventPublisher | null | undefined;
  now: Date;
  supplier: AdminSupplierDetail | null;
}) {
  const updatedContact = findSupplierContact(
    input.supplier,
    input.contactReference,
  );
  if (!input.contact || !input.supplier) return;
  await input.eventPublisher?.publish(
    createSupplierPortalInvitedEvent({
      actor: input.actor,
      contact: input.contact,
      deliveryStatus: updatedContact?.latestInvite?.deliveryStatus ?? null,
      invitedUserSlug: updatedContact?.userSlug ?? null,
      occurredAt: input.now,
    }),
  );
}

export async function publishSupplierPortalUnlinked(input: {
  actor: SupplierActor;
  contact: SupplierPortalContactEventContext | null;
  eventPublisher?: PlatformEventPublisher | null | undefined;
  now: Date;
  supplier: AdminSupplierDetail | null;
}) {
  if (!input.contact || !input.supplier) return;
  await input.eventPublisher?.publish(
    createSupplierPortalUnlinkedEvent({
      actor: input.actor,
      contact: input.contact,
      occurredAt: input.now,
    }),
  );
}

export async function publishSupplierProductLinked(input: {
  actor: SupplierActor;
  eventPublisher?: PlatformEventPublisher | null | undefined;
  now: Date;
  productSlug: string;
  supplier: AdminSupplierDetail | null;
}) {
  const linkedProduct = findSupplierProduct(input.supplier, input.productSlug);
  if (!input.supplier || !linkedProduct) return;
  await input.eventPublisher?.publish(
    createSupplierProductLinkedEvent({
      actor: input.actor,
      context: {
        brandName: linkedProduct.brandName,
        categoryName: linkedProduct.categoryName,
        productName: linkedProduct.productName,
        productSlug: linkedProduct.productSlug,
        supplierName: input.supplier.name,
        supplierSlug: input.supplier.slug,
        variantCount: linkedProduct.variantCount,
      },
      isPreferred: linkedProduct.isPreferred,
      occurredAt: input.now,
    }),
  );
}

export async function publishSupplierProductUnlinked(input: {
  actor: SupplierActor;
  context: SupplierProductEventContext | null;
  deleted: boolean;
  eventPublisher?: PlatformEventPublisher | null | undefined;
  now: Date;
}) {
  if (!input.deleted || !input.context) return;
  await input.eventPublisher?.publish(
    createSupplierProductUnlinkedEvent({
      actor: input.actor,
      context: input.context,
      occurredAt: input.now,
    }),
  );
}

export async function publishSupplierProcurementCreated(input: {
  actor: SupplierActor;
  eventPublisher?: PlatformEventPublisher | null | undefined;
  now: Date;
  reference: string;
  supplier: AdminSupplierDetail | null;
}) {
  const order = findSupplierProcurementOrder(input.supplier, input.reference);
  if (!input.supplier || !order) return;
  await input.eventPublisher?.publish(
    createSupplierProcurementCreatedEvent({
      actor: input.actor,
      context: toSupplierProcurementEventContext(input.supplier, order),
      occurredAt: input.now,
    }),
  );
}

export async function publishSupplierProcurementStatusUpdated(input: {
  actor: SupplierActor;
  eventPublisher?: PlatformEventPublisher | null | undefined;
  now: Date;
  reference: string;
  supplier: AdminSupplierDetail | null;
}) {
  const order = findSupplierProcurementOrder(input.supplier, input.reference);
  if (!input.supplier || !order) return;
  await input.eventPublisher?.publish(
    createSupplierProcurementStatusUpdatedEvent({
      actor: input.actor,
      context: toSupplierProcurementEventContext(input.supplier, order),
      occurredAt: input.now,
    }),
  );
}

export async function publishSupplierProcurementReceived(input: {
  actor: SupplierActor;
  eventPublisher?: PlatformEventPublisher | null | undefined;
  now: Date;
  reference: string;
  supplier: AdminSupplierDetail | null;
}) {
  const order = findSupplierProcurementOrder(input.supplier, input.reference);
  if (!input.supplier || !order) return;
  await input.eventPublisher?.publish(
    createSupplierProcurementReceivedEvent({
      actor: input.actor,
      context: toSupplierProcurementEventContext(input.supplier, order),
      occurredAt: input.now,
    }),
  );
}
