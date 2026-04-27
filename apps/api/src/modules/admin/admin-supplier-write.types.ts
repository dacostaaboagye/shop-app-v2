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

export type AdminSupplierWriteRepository = {
  addContact(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateSupplierContactRequest;
    supplierSlug: string;
  }): Promise<AdminSupplierDetail | null>;
  removeContact(input: {
    contactReference: string;
    supplierSlug: string;
  }): Promise<"deleted" | "not_found" | "primary_contact">;
  linkContactPortal(input: {
    actorId: string;
    contactReference: string;
    now: Date;
    payload: AdminLinkSupplierContactPortalRequest;
    supplierSlug: string;
  }): Promise<AdminSupplierDetail | null>;
  inviteContactPortal(input: {
    actorId: string;
    contactReference: string;
    now: Date;
    supplierSlug: string;
  }): Promise<AdminSupplierDetail | null>;
  unlinkContactPortal(input: {
    contactReference: string;
    now: Date;
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
  createInquiry(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateSupplierInquiryRequest;
    reference: string;
    supplierSlug: string;
  }): Promise<AdminSupplierDetail | null>;
  linkProduct(input: {
    actorId: string;
    now: Date;
    payload: AdminLinkSupplierProductRequest;
    supplierSlug: string;
  }): Promise<AdminSupplierDetail | null>;
  getSupplierProductEventContext(input: {
    productSlug: string;
    supplierSlug: string;
  }): Promise<
    import("./admin-supplier-events.js").SupplierProductEventContext | null
  >;
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
  updateInquiry(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateSupplierInquiryRequest;
    reference: string;
    supplierSlug: string;
  }): Promise<AdminSupplierDetail | null>;
  getPortalContactEventContext(input: {
    contactReference: string;
    supplierSlug: string;
  }): Promise<
    | import("./admin-supplier-events.js").SupplierPortalContactEventContext
    | null
  >;
};
