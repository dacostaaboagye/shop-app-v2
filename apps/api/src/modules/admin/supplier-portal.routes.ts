import { adminSupplierDetailSchema } from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { AdminSupplierQueryService } from "./admin-supplier-query.service.js";

type SupplierPortalRouteDependencies = {
  adminSupplierQueryService: Pick<
    AdminSupplierQueryService,
    "getSupplierForPortalUser"
  >;
};

const supplierPortalAccess = {
  kind: "permission",
  permission: "supplier.dashboard.view",
} as const;

export function registerSupplierPortalRoutes(
  server: FastifyInstance,
  dependencies: SupplierPortalRouteDependencies = createUnavailableDependencies(),
) {
  server.get(
    "/api/supplier/profile",
    { config: { access: supplierPortalAccess } },
    async (request) => {
      const supplier =
        await dependencies.adminSupplierQueryService.getSupplierForPortalUser(
          getAuthenticatedUserId(request),
        );
      if (!supplier) throw supplierPortalNotLinked();
      return adminSupplierDetailSchema.parse(supplier);
    },
  );
}

function createUnavailableDependencies(): SupplierPortalRouteDependencies {
  return {
    adminSupplierQueryService: {
      async getSupplierForPortalUser() {
        throw new AppError({
          code: "internal_error",
          detail: "Supplier portal services are not configured.",
          statusCode: 503,
          title: "Supplier portal unavailable",
        });
      },
    },
  };
}

function supplierPortalNotLinked() {
  return new AppError({
    code: "forbidden",
    detail: "Your account is not linked to an active supplier contact.",
    statusCode: 403,
    title: "Supplier account not linked",
  });
}
