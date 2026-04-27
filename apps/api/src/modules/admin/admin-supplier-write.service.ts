import type {
  AdminCreateSupplierContactRequest,
  AdminCreateSupplierInquiryRequest,
  AdminCreateSupplierProcurementOrderRequest,
  AdminCreateSupplierRequest,
  AdminLinkSupplierContactPortalRequest,
  AdminLinkSupplierProductRequest,
  AdminSupplierDetail,
  AdminSupplierProcurementReceiveRequest,
  AdminUpdateSupplierInquiryRequest,
  AdminUpdateSupplierRequest,
} from "@shop/contracts";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import {
  createSupplierPortalInvitedEvent,
  createSupplierPortalLinkedEvent,
  createSupplierPortalUnlinkedEvent,
  createSupplierProcurementCreatedEvent,
  createSupplierProcurementReceivedEvent,
  createSupplierProcurementStatusUpdatedEvent,
  createSupplierProductLinkedEvent,
  createSupplierProductUnlinkedEvent,
} from "./admin-supplier-events.js";
import { generateSupplierReference } from "./admin-supplier-reference.js";
import type { AdminSupplierWriteRepository } from "./admin-supplier-write.types.js";

export class AdminSupplierWriteService {
  constructor(
    private readonly repository: AdminSupplierWriteRepository,
    private readonly referenceNumberService?: Pick<
      ReferenceNumberService,
      "generateReference"
    >,
    private readonly eventPublisher?: PlatformEventPublisher | null,
  ) {}

  async addContact(
    supplierSlug: string,
    actorId: string,
    payload: AdminCreateSupplierContactRequest,
    now: Date,
  ) {
    return this.repository.addContact({ actorId, now, payload, supplierSlug });
  }

  async removeContact(supplierSlug: string, contactReference: string) {
    return this.repository.removeContact({ contactReference, supplierSlug });
  }

  async linkContactPortal(
    supplierSlug: string,
    contactReference: string,
    actor: { userId: string; userSlug: string },
    payload: AdminLinkSupplierContactPortalRequest,
    now: Date,
  ) {
    const contact = await this.repository.getPortalContactEventContext({
      contactReference,
      supplierSlug,
    });
    const supplier = await this.repository.linkContactPortal({
      actorId: actor.userId,
      contactReference,
      now,
      payload,
      supplierSlug,
    });

    if (contact && supplier) {
      await this.eventPublisher?.publish(
        createSupplierPortalLinkedEvent({
          actor,
          contact,
          linkedUserSlug: payload.userSlug,
          occurredAt: now,
        }),
      );
    }

    return supplier;
  }

  async inviteContactPortal(
    supplierSlug: string,
    contactReference: string,
    actor: { userId: string; userSlug: string },
    now: Date,
  ) {
    const contact = await this.repository.getPortalContactEventContext({
      contactReference,
      supplierSlug,
    });
    const supplier = await this.repository.inviteContactPortal({
      actorId: actor.userId,
      contactReference,
      now,
      supplierSlug,
    });

    const updatedContact = findSupplierContact(supplier, contactReference);
    if (contact && supplier) {
      await this.eventPublisher?.publish(
        createSupplierPortalInvitedEvent({
          actor,
          contact,
          deliveryStatus: updatedContact?.latestInvite?.deliveryStatus ?? null,
          invitedUserSlug: updatedContact?.userSlug ?? null,
          occurredAt: now,
        }),
      );
    }

    return supplier;
  }

  async unlinkContactPortal(
    supplierSlug: string,
    contactReference: string,
    actor: { userId: string; userSlug: string },
    now: Date,
  ) {
    const contact = await this.repository.getPortalContactEventContext({
      contactReference,
      supplierSlug,
    });
    const supplier = await this.repository.unlinkContactPortal({
      contactReference,
      now,
      supplierSlug,
    });

    if (contact && supplier) {
      await this.eventPublisher?.publish(
        createSupplierPortalUnlinkedEvent({
          actor,
          contact,
          occurredAt: now,
        }),
      );
    }

    return supplier;
  }

  async createSupplier(
    actorId: string,
    payload: AdminCreateSupplierRequest,
    now: Date,
  ) {
    return this.repository.createSupplier({ actorId, now, payload });
  }

  async createProcurementOrder(
    supplierSlug: string,
    actor: { userId: string; userSlug: string },
    payload: AdminCreateSupplierProcurementOrderRequest,
    now: Date,
  ) {
    const reference = await generateSupplierReference({
      missingDetail:
        "Reference generation is not configured for supplier orders.",
      missingTitle: "Supplier procurement unavailable",
      now,
      referenceNumberService: this.referenceNumberService,
      sequenceKey: "purchase-order",
    });
    const supplier = await this.repository.createProcurementOrder({
      actorId: actor.userId,
      now,
      payload,
      reference,
      supplierSlug,
    });

    const order = findSupplierProcurementOrder(supplier, reference);
    if (supplier && order) {
      await this.eventPublisher?.publish(
        createSupplierProcurementCreatedEvent({
          actor,
          context: toSupplierProcurementEventContext(supplier, order),
          occurredAt: now,
        }),
      );
    }

    return supplier;
  }

  async createInquiry(
    supplierSlug: string,
    actorId: string,
    payload: AdminCreateSupplierInquiryRequest,
    now: Date,
  ) {
    const reference = await generateSupplierReference({
      missingDetail:
        "Reference generation is not configured for supplier inquiries.",
      missingTitle: "Supplier inquiry unavailable",
      now,
      referenceNumberService: this.referenceNumberService,
      sequenceKey: "supplier-inquiry",
    });
    return this.repository.createInquiry({
      actorId,
      now,
      payload,
      reference,
      supplierSlug,
    });
  }

  async linkProduct(
    supplierSlug: string,
    actor: { userId: string; userSlug: string },
    payload: AdminLinkSupplierProductRequest,
    now: Date,
  ) {
    const supplier = await this.repository.linkProduct({
      actorId: actor.userId,
      now,
      payload,
      supplierSlug,
    });

    const linkedProduct = findSupplierProduct(supplier, payload.productSlug);
    if (supplier && linkedProduct) {
      await this.eventPublisher?.publish(
        createSupplierProductLinkedEvent({
          actor,
          context: {
            brandName: linkedProduct.brandName,
            categoryName: linkedProduct.categoryName,
            productName: linkedProduct.productName,
            productSlug: linkedProduct.productSlug,
            supplierName: supplier.name,
            supplierSlug: supplier.slug,
            variantCount: linkedProduct.variantCount,
          },
          isPreferred: linkedProduct.isPreferred,
          occurredAt: now,
        }),
      );
    }

    return supplier;
  }

  async unlinkProduct(
    supplierSlug: string,
    productSlug: string,
    actor: { userId: string; userSlug: string },
    now: Date,
  ) {
    const context = await this.repository.getSupplierProductEventContext({
      productSlug,
      supplierSlug,
    });
    const deleted = await this.repository.unlinkProduct({
      productSlug,
      supplierSlug,
    });

    if (deleted && context) {
      await this.eventPublisher?.publish(
        createSupplierProductUnlinkedEvent({
          actor,
          context,
          occurredAt: now,
        }),
      );
    }

    return deleted;
  }

  async transitionProcurementOrder(
    supplierSlug: string,
    reference: string,
    actor: { userId: string; userSlug: string },
    status: "submitted" | "approved" | "ordered" | "cancelled" | "closed",
    notes: string | null,
    now: Date,
  ) {
    const supplier = await this.repository.transitionProcurementOrder({
      actorId: actor.userId,
      notes,
      now,
      reference,
      status,
      supplierSlug,
    });

    const order = findSupplierProcurementOrder(supplier, reference);
    if (supplier && order) {
      await this.eventPublisher?.publish(
        createSupplierProcurementStatusUpdatedEvent({
          actor,
          context: toSupplierProcurementEventContext(supplier, order),
          occurredAt: now,
        }),
      );
    }

    return supplier;
  }

  async receiveProcurementOrder(
    supplierSlug: string,
    reference: string,
    actor: { userId: string; userSlug: string },
    payload: AdminSupplierProcurementReceiveRequest,
    now: Date,
  ) {
    const supplier = await this.repository.receiveProcurementOrder({
      actorId: actor.userId,
      lines: payload.lines,
      notes: payload.notes ?? null,
      now,
      reference,
      supplierSlug,
    });

    const order = findSupplierProcurementOrder(supplier, reference);
    if (supplier && order) {
      await this.eventPublisher?.publish(
        createSupplierProcurementReceivedEvent({
          actor,
          context: toSupplierProcurementEventContext(supplier, order),
          occurredAt: now,
        }),
      );
    }

    return supplier;
  }

  async updateSupplier(
    supplierSlug: string,
    actorId: string,
    payload: AdminUpdateSupplierRequest,
    now: Date,
  ) {
    return this.repository.updateSupplier({
      actorId,
      now,
      payload,
      supplierSlug,
    });
  }

  async updateInquiry(
    supplierSlug: string,
    reference: string,
    actorId: string,
    payload: AdminUpdateSupplierInquiryRequest,
    now: Date,
  ) {
    return this.repository.updateInquiry({
      actorId,
      now,
      payload,
      reference,
      supplierSlug,
    });
  }
}

function findSupplierContact(
  supplier: AdminSupplierDetail | null,
  contactReference: string,
) {
  return supplier?.contacts?.find(
    (contact) => contact.contactReference === contactReference,
  );
}

function findSupplierProduct(
  supplier: AdminSupplierDetail | null,
  productSlug: string,
) {
  return supplier?.products?.find(
    (product) => product.productSlug === productSlug,
  );
}

function findSupplierProcurementOrder(
  supplier: AdminSupplierDetail | null,
  reference: string,
) {
  return supplier?.procurementOrders?.find(
    (order) => order.reference === reference,
  );
}

function toSupplierProcurementEventContext(
  supplier: AdminSupplierDetail,
  order: NonNullable<AdminSupplierDetail["procurementOrders"]>[number],
) {
  const totalApprovedQuantity = order.lines.reduce(
    (sum, line) => sum + (line.approvedQuantity ?? 0),
    0,
  );
  const totalReceivedQuantity = order.lines.reduce(
    (sum, line) => sum + line.receivedQuantity,
    0,
  );
  const totalRequestedQuantity = order.lines.reduce(
    (sum, line) => sum + line.requestedQuantity,
    0,
  );

  return {
    destinationLocationName: order.destinationLocationName,
    destinationLocationSlug: order.destinationLocationSlug,
    lineCount: order.lines.length,
    notes: order.notes,
    reference: order.reference,
    status: order.status,
    supplierName: supplier.name,
    supplierSlug: supplier.slug,
    totalApprovedQuantity,
    totalReceivedQuantity,
    totalRequestedQuantity,
  };
}
