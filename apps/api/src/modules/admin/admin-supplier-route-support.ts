import {
  adminSupplierProcurementReceiveRequestSchema,
  adminSupplierProcurementTransitionRequestSchema,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { AdminSupplierQueryService } from "./admin-supplier-query.service.js";
import type { AdminSupplierWriteService } from "./admin-supplier-write.service.js";

export type AdminSupplierRouteDependencies = {
  adminSupplierQueryService: Pick<
    AdminSupplierQueryService,
    "getSupplier" | "getSupplierForPortalUser" | "listSuppliers"
  >;
  adminSupplierWriteService: Pick<
    AdminSupplierWriteService,
    | "addContact"
    | "createInquiry"
    | "createProcurementOrder"
    | "createSupplier"
    | "inviteContactPortal"
    | "linkContactPortal"
    | "linkProduct"
    | "receiveProcurementOrder"
    | "removeContact"
    | "transitionProcurementOrder"
    | "unlinkContactPortal"
    | "unlinkProduct"
    | "updateSupplier"
    | "updateInquiry"
  >;
};

export function createUnavailableSupplierDependencies(): AdminSupplierRouteDependencies {
  return {
    adminSupplierQueryService: {
      async getSupplier() {
        throw unavailableSupplierError();
      },
      async getSupplierForPortalUser() {
        throw unavailableSupplierError();
      },
      async listSuppliers() {
        throw unavailableSupplierError();
      },
    },
    adminSupplierWriteService: {
      async addContact() {
        throw unavailableSupplierError();
      },
      async createProcurementOrder() {
        throw unavailableSupplierError();
      },
      async createInquiry() {
        throw unavailableSupplierError();
      },
      async createSupplier() {
        throw unavailableSupplierError();
      },
      async linkProduct() {
        throw unavailableSupplierError();
      },
      async inviteContactPortal() {
        throw unavailableSupplierError();
      },
      async linkContactPortal() {
        throw unavailableSupplierError();
      },
      async receiveProcurementOrder() {
        throw unavailableSupplierError();
      },
      async removeContact() {
        throw unavailableSupplierError();
      },
      async transitionProcurementOrder() {
        throw unavailableSupplierError();
      },
      async unlinkProduct() {
        throw unavailableSupplierError();
      },
      async unlinkContactPortal() {
        throw unavailableSupplierError();
      },
      async updateSupplier() {
        throw unavailableSupplierError();
      },
      async updateInquiry() {
        throw unavailableSupplierError();
      },
    },
  };
}

export async function handleSupplierProcurementAction(input: {
  action: string;
  actorId: string;
  body: unknown;
  reference: string;
  service: AdminSupplierRouteDependencies["adminSupplierWriteService"];
  slug: string;
}) {
  const now = new Date();
  if (input.action === "receive") {
    const payload = adminSupplierProcurementReceiveRequestSchema.parse(
      input.body,
    );
    return input.service.receiveProcurementOrder(
      input.slug,
      input.reference,
      input.actorId,
      payload,
      now,
    );
  }

  const payload = adminSupplierProcurementTransitionRequestSchema.parse(
    input.body,
  );
  return input.service.transitionProcurementOrder(
    input.slug,
    input.reference,
    input.actorId,
    procurementActionStatus(input.action),
    payload.notes ?? null,
    now,
  );
}

export function supplierNotFound(slug: string) {
  return new AppError({
    code: "not_found",
    detail: `Supplier "${slug}" does not exist.`,
    statusCode: 404,
    title: "Supplier not found",
  });
}

export function supplierProductLinkNotFound(slug: string, productSlug: string) {
  return new AppError({
    code: "not_found",
    detail: `Supplier "${slug}" is not linked to product "${productSlug}".`,
    statusCode: 404,
    title: "Supplier product link not found",
  });
}

export function supplierContactNotFound(
  slug: string,
  contactReference: string,
) {
  return new AppError({
    code: "not_found",
    detail: `Supplier "${slug}" does not have contact "${contactReference}".`,
    statusCode: 404,
    title: "Supplier contact not found",
  });
}

export function supplierPrimaryContactCannotBeRemoved() {
  return new AppError({
    code: "conflict",
    detail:
      "The primary supplier contact cannot be removed. Mark another contact as primary first.",
    statusCode: 409,
    title: "Primary contact cannot be removed",
  });
}

export function supplierProcurementOrderNotFound(
  slug: string,
  reference: string,
) {
  return new AppError({
    code: "not_found",
    detail: `Supplier "${slug}" does not have procurement order "${reference}".`,
    statusCode: 404,
    title: "Supplier procurement order not found",
  });
}

function procurementActionStatus(action: string) {
  const statusByAction = {
    approve: "approved",
    cancel: "cancelled",
    close: "closed",
    order: "ordered",
    submit: "submitted",
  } as const;
  const status = statusByAction[action as keyof typeof statusByAction];
  if (status) return status;

  throw new AppError({
    code: "validation_error",
    detail: `Supplier procurement action "${action}" is not supported.`,
    statusCode: 400,
    title: "Unsupported supplier procurement action",
  });
}

function unavailableSupplierError() {
  return new AppError({
    code: "internal_error",
    detail: "Admin supplier services are not configured for this environment.",
    statusCode: 503,
    title: "Admin suppliers unavailable",
  });
}
