import type {
  AdminCreateSupplierContactRequest,
  AdminCreateSupplierProcurementOrderRequest,
  AdminCreateSupplierRequest,
  AdminLinkSupplierProductRequest,
  AdminSupplierDetail,
  AdminSupplierProcurementReceiveRequest,
  AdminUpdateSupplierRequest,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";

export type AdminSupplierWriteRepository = {
  addContact(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateSupplierContactRequest;
    supplierSlug: string;
  }): Promise<AdminSupplierDetail | null>;
  createSupplier(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateSupplierRequest;
  }): Promise<AdminSupplierDetail>;
  createProcurementOrder(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateSupplierProcurementOrderRequest;
    reference: string;
    supplierSlug: string;
  }): Promise<AdminSupplierDetail | null>;
  linkProduct(input: {
    actorId: string;
    now: Date;
    payload: AdminLinkSupplierProductRequest;
    supplierSlug: string;
  }): Promise<AdminSupplierDetail | null>;
  unlinkProduct(input: {
    productSlug: string;
    supplierSlug: string;
  }): Promise<boolean>;
  transitionProcurementOrder(input: {
    actorId: string;
    now: Date;
    notes: string | null;
    reference: string;
    status: "submitted" | "approved" | "ordered" | "cancelled" | "closed";
    supplierSlug: string;
  }): Promise<AdminSupplierDetail | null>;
  receiveProcurementOrder(input: {
    actorId: string;
    lines: AdminSupplierProcurementReceiveRequest["lines"];
    notes: string | null;
    now: Date;
    reference: string;
    supplierSlug: string;
  }): Promise<AdminSupplierDetail | null>;
  updateSupplier(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateSupplierRequest;
    supplierSlug: string;
  }): Promise<AdminSupplierDetail | null>;
};

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
    if (!this.referenceNumberService) {
      throw new AppError({
        code: "internal_error",
        detail: "Reference generation is not configured for supplier orders.",
        statusCode: 503,
        title: "Supplier procurement unavailable",
      });
    }
    const reference = await this.referenceNumberService.generateReference({
      now,
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
}
