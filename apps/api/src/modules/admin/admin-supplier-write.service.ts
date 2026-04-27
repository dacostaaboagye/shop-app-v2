import type {
  AdminCreateSupplierProcurementOrderRequest,
  AdminLinkSupplierContactPortalRequest,
  AdminLinkSupplierProductRequest,
  AdminSupplierProcurementReceiveRequest,
} from "@shop/contracts";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import { AdminSupplierCrudService } from "./admin-supplier-crud.service.js";
import {
  publishSupplierPortalInvited,
  publishSupplierPortalLinked,
  publishSupplierPortalUnlinked,
  publishSupplierProcurementCreated,
  publishSupplierProcurementReceived,
  publishSupplierProcurementStatusUpdated,
  publishSupplierProductLinked,
  publishSupplierProductUnlinked,
} from "./admin-supplier-event-publishers.js";
import { generateSupplierReference } from "./admin-supplier-reference.js";
import type { AdminSupplierWriteRepository } from "./admin-supplier-write.types.js";

export class AdminSupplierWriteService extends AdminSupplierCrudService {
  constructor(
    repository: AdminSupplierWriteRepository,
    referenceNumberService?: Pick<ReferenceNumberService, "generateReference">,
    private readonly eventPublisher?: PlatformEventPublisher | null,
  ) {
    super(repository, referenceNumberService);
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
    await publishSupplierPortalLinked({
      actor,
      contact,
      eventPublisher: this.eventPublisher,
      now,
      payload,
      supplier,
    });
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
    await publishSupplierPortalInvited({
      actor,
      contact,
      contactReference,
      eventPublisher: this.eventPublisher,
      now,
      supplier,
    });
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
    await publishSupplierPortalUnlinked({
      actor,
      contact,
      eventPublisher: this.eventPublisher,
      now,
      supplier,
    });
    return supplier;
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
    await publishSupplierProcurementCreated({
      actor,
      eventPublisher: this.eventPublisher,
      now,
      reference,
      supplier,
    });
    return supplier;
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
    await publishSupplierProductLinked({
      actor,
      eventPublisher: this.eventPublisher,
      now,
      productSlug: payload.productSlug,
      supplier,
    });
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
    await publishSupplierProductUnlinked({
      actor,
      context,
      deleted,
      eventPublisher: this.eventPublisher,
      now,
    });
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
    await publishSupplierProcurementStatusUpdated({
      actor,
      eventPublisher: this.eventPublisher,
      now,
      reference,
      supplier,
    });
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
    await publishSupplierProcurementReceived({
      actor,
      eventPublisher: this.eventPublisher,
      now,
      reference,
      supplier,
    });
    return supplier;
  }
}
