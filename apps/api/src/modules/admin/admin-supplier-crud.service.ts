import type {
  AdminCreateSupplierContactRequest,
  AdminCreateSupplierInquiryRequest,
  AdminCreateSupplierRequest,
  AdminUpdateSupplierInquiryRequest,
  AdminUpdateSupplierRequest,
} from "@shop/contracts";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import { generateSupplierReference } from "./admin-supplier-reference.js";
import type { AdminSupplierWriteRepository } from "./admin-supplier-write.types.js";

export class AdminSupplierCrudService {
  constructor(
    protected readonly repository: AdminSupplierWriteRepository,
    protected readonly referenceNumberService?: Pick<
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

  async createSupplier(
    actorId: string,
    payload: AdminCreateSupplierRequest,
    now: Date,
  ) {
    return this.repository.createSupplier({ actorId, now, payload });
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
