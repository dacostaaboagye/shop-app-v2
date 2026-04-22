import {
  adminCreateSupplierContactRequestSchema,
  adminCreateSupplierProcurementOrderRequestSchema,
  adminCreateSupplierRequestSchema,
  adminLinkSupplierProductRequestSchema,
  adminSupplierDetailSchema,
  adminSupplierListQuerySchema,
  adminSupplierListResponseSchema,
  adminUpdateSupplierRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import {
  type AdminSupplierRouteDependencies,
  createUnavailableSupplierDependencies,
  handleSupplierProcurementAction,
  supplierNotFound,
  supplierProcurementOrderNotFound,
  supplierProductLinkNotFound,
} from "./admin-supplier-route-support.js";

const adminSupplierListRoute: RouteDefinition = {
  access: { kind: "permission", permission: "suppliers.view" },
  method: "GET",
  url: "/api/admin/suppliers",
};
const adminSupplierManageAccess = {
  kind: "permission",
  permission: "suppliers.manage",
} as const;

export function registerAdminSupplierRoutes(
  server: FastifyInstance,
  dependencies: AdminSupplierRouteDependencies = createUnavailableSupplierDependencies(),
) {
  server.route({
    config: { access: adminSupplierListRoute.access },
    method: adminSupplierListRoute.method,
    url: adminSupplierListRoute.url,
    async handler(request) {
      const query = adminSupplierListQuerySchema.parse(request.query);
      const result =
        await dependencies.adminSupplierQueryService.listSuppliers(query);

      return adminSupplierListResponseSchema.parse({
        items: result.items,
        page: query.page,
        pageSize: query.pageSize,
        totalCount: result.totalCount,
      });
    },
  });

  server.get(
    "/api/admin/suppliers/:slug",
    { config: { access: adminSupplierListRoute.access } },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const supplier =
        await dependencies.adminSupplierQueryService.getSupplier(slug);
      if (!supplier) throw supplierNotFound(slug);
      return adminSupplierDetailSchema.parse(supplier);
    },
  );

  server.post(
    "/api/admin/suppliers",
    { config: { access: adminSupplierManageAccess } },
    async (request) => {
      const payload = adminCreateSupplierRequestSchema.parse(request.body);
      const supplier =
        await dependencies.adminSupplierWriteService.createSupplier(
          getAuthenticatedUserId(request),
          payload,
          new Date(),
        );
      return adminSupplierDetailSchema.parse(supplier);
    },
  );

  server.patch(
    "/api/admin/suppliers/:slug",
    { config: { access: adminSupplierManageAccess } },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const payload = adminUpdateSupplierRequestSchema.parse(request.body);
      const supplier =
        await dependencies.adminSupplierWriteService.updateSupplier(
          slug,
          getAuthenticatedUserId(request),
          payload,
          new Date(),
        );
      if (!supplier) throw supplierNotFound(slug);
      return adminSupplierDetailSchema.parse(supplier);
    },
  );

  server.post(
    "/api/admin/suppliers/:slug/contacts",
    { config: { access: adminSupplierManageAccess } },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const payload = adminCreateSupplierContactRequestSchema.parse(
        request.body,
      );
      const supplier = await dependencies.adminSupplierWriteService.addContact(
        slug,
        getAuthenticatedUserId(request),
        payload,
        new Date(),
      );
      if (!supplier) throw supplierNotFound(slug);
      return adminSupplierDetailSchema.parse(supplier);
    },
  );

  server.post(
    "/api/admin/suppliers/:slug/products",
    { config: { access: adminSupplierManageAccess } },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const payload = adminLinkSupplierProductRequestSchema.parse(request.body);
      const supplier = await dependencies.adminSupplierWriteService.linkProduct(
        slug,
        getAuthenticatedUserId(request),
        payload,
        new Date(),
      );
      if (!supplier) throw supplierNotFound(slug);
      return adminSupplierDetailSchema.parse(supplier);
    },
  );

  server.post(
    "/api/admin/suppliers/:slug/procurement-orders",
    { config: { access: adminSupplierManageAccess } },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const payload = adminCreateSupplierProcurementOrderRequestSchema.parse(
        request.body,
      );
      const supplier =
        await dependencies.adminSupplierWriteService.createProcurementOrder(
          slug,
          getAuthenticatedUserId(request),
          payload,
          new Date(),
        );
      if (!supplier) throw supplierNotFound(slug);
      return adminSupplierDetailSchema.parse(supplier);
    },
  );

  server.post(
    "/api/admin/suppliers/:slug/procurement-orders/:reference/:action",
    { config: { access: adminSupplierManageAccess } },
    async (request) => {
      const { action, reference, slug } = request.params as {
        action: string;
        reference: string;
        slug: string;
      };
      const supplier = await handleSupplierProcurementAction({
        action,
        actorId: getAuthenticatedUserId(request),
        body: request.body,
        reference,
        slug,
        service: dependencies.adminSupplierWriteService,
      });
      if (!supplier) throw supplierProcurementOrderNotFound(slug, reference);
      return adminSupplierDetailSchema.parse(supplier);
    },
  );

  server.delete(
    "/api/admin/suppliers/:slug/products/:productSlug",
    { config: { access: adminSupplierManageAccess } },
    async (request) => {
      const { productSlug, slug } = request.params as {
        productSlug: string;
        slug: string;
      };
      const deleted =
        await dependencies.adminSupplierWriteService.unlinkProduct(
          slug,
          productSlug,
        );
      if (!deleted) throw supplierProductLinkNotFound(slug, productSlug);
      return { success: true };
    },
  );
}
