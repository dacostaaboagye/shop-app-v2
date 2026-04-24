import type {
  AdminCreateSupplierContactRequest,
  AdminCreateSupplierInquiryRequest,
  AdminCreateSupplierProcurementOrderRequest,
  AdminCreateSupplierRequest,
  AdminLinkSupplierContactPortalRequest,
  AdminLinkSupplierProductRequest,
  AdminSupplierProcurementReceiveRequest,
  AdminUpdateSupplierInquiryRequest,
  AdminUpdateSupplierRequest,
} from "@shop/contracts";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import { generateSupplierReference } from "./admin-supplier-reference.js";
import type { AdminSupplierWriteRepository } from "./admin-supplier-write.types.js";

export class AdminSupplierWriteService {
  constructor(
    private readonly repository: AdminSupplierWriteRepository,
    private readonly referenceNumberService?: Pick<
      ReferenceNumberService,
      "generateReference"
    >,
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
    actorId: string,
    payload: AdminLinkSupplierContactPortalRequest,
    now: Date,
  ) {
    return this.repository.linkContactPortal({
      actorId,
      contactReference,
      now,
      payload,
      supplierSlug,
    });
  }

  async inviteContactPortal(
    supplierSlug: string,
    contactReference: string,
    actorId: string,
    now: Date,
  ) {
    return this.repository.inviteContactPortal({
      actorId,
      contactReference,
      now,
      supplierSlug,
    });
  }

  async unlinkContactPortal(
    supplierSlug: string,
    contactReference: string,
    now: Date,
  ) {
    return this.repository.unlinkContactPortal({
      contactReference,
      now,
      supplierSlug,
    });
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
    actorId: string,
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
    return this.repository.createProcurementOrder({
      actorId,
      now,
      payload,
      reference,
      supplierSlug,
    });
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
    actorId: string,
    payload: AdminLinkSupplierProductRequest,
    now: Date,
  ) {
    return this.repository.linkProduct({ actorId, now, payload, supplierSlug });
  }

  async unlinkProduct(supplierSlug: string, productSlug: string) {
    return this.repository.unlinkProduct({ productSlug, supplierSlug });
  }

  async transitionProcurementOrder(
    supplierSlug: string,
    reference: string,
    actorId: string,
    status: "submitted" | "approved" | "ordered" | "cancelled" | "closed",
    notes: string | null,
    now: Date,
  ) {
    return this.repository.transitionProcurementOrder({
      actorId,
      notes,
      now,
      reference,
      status,
      supplierSlug,
    });
  }

  async receiveProcurementOrder(
    supplierSlug: string,
    reference: string,
    actorId: string,
    payload: AdminSupplierProcurementReceiveRequest,
    now: Date,
  ) {
    return this.repository.receiveProcurementOrder({
      actorId,
      lines: payload.lines,
      notes: payload.notes ?? null,
      now,
      reference,
      supplierSlug,
    });
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
