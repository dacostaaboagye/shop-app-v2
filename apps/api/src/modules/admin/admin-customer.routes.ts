import {
  adminCreateCustomerAddressRequestSchema,
  adminCreateCustomerContactRequestSchema,
  adminCreateCustomerRequestSchema,
  adminCustomerDetailSchema,
  adminCustomerListQuerySchema,
  adminCustomerListResponseSchema,
  adminLinkCustomerContactPortalRequestSchema,
  adminUpdateCustomerRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import type { RouteDefinition } from "../_core/route-contract.js";
import {
  getAuthenticatedActor,
  getAuthenticatedUserId,
} from "../auth/auth-route-support.js";
import {
  type AdminCustomerRouteDependencies,
  createUnavailableCustomerDependencies,
  customerNotFound,
} from "./admin-customer-route-support.js";

const adminCustomerListRoute: RouteDefinition = {
  access: { kind: "permission", permission: "customers.view" },
  method: "GET",
  url: "/api/admin/customers",
};
const adminCustomerManageAccess = {
  kind: "permission",
  permission: "customers.manage",
} as const;

export function registerAdminCustomerRoutes(
  server: FastifyInstance,
  dependencies: AdminCustomerRouteDependencies = createUnavailableCustomerDependencies(),
) {
  server.route({
    config: { access: adminCustomerListRoute.access },
    method: adminCustomerListRoute.method,
    url: adminCustomerListRoute.url,
    async handler(request) {
      const query = adminCustomerListQuerySchema.parse(request.query);
      const result =
        await dependencies.adminCustomerQueryService.listCustomers(query);

      return adminCustomerListResponseSchema.parse({
        items: result.items,
        page: query.page,
        pageSize: query.pageSize,
        totalCount: result.totalCount,
      });
    },
  });

  server.get(
    "/api/admin/customers/:slug",
    { config: { access: adminCustomerListRoute.access } },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const customer =
        await dependencies.adminCustomerQueryService.getCustomer(slug);
      if (!customer) throw customerNotFound(slug);
      return adminCustomerDetailSchema.parse(customer);
    },
  );

  server.post(
    "/api/admin/customers",
    { config: { access: adminCustomerManageAccess } },
    async (request) => {
      const payload = adminCreateCustomerRequestSchema.parse(request.body);
      const customer =
        await dependencies.adminCustomerWriteService.createCustomer(
          getAuthenticatedUserId(request),
          payload,
          new Date(),
        );
      return adminCustomerDetailSchema.parse(customer);
    },
  );

  server.patch(
    "/api/admin/customers/:slug",
    { config: { access: adminCustomerManageAccess } },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const payload = adminUpdateCustomerRequestSchema.parse(request.body);
      const customer =
        await dependencies.adminCustomerWriteService.updateCustomer(
          slug,
          getAuthenticatedUserId(request),
          payload,
          new Date(),
        );
      if (!customer) throw customerNotFound(slug);
      return adminCustomerDetailSchema.parse(customer);
    },
  );

  server.post(
    "/api/admin/customers/:slug/contacts",
    { config: { access: adminCustomerManageAccess } },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const payload = adminCreateCustomerContactRequestSchema.parse(
        request.body,
      );
      const customer = await dependencies.adminCustomerWriteService.addContact(
        slug,
        getAuthenticatedUserId(request),
        payload,
        new Date(),
      );
      if (!customer) throw customerNotFound(slug);
      return adminCustomerDetailSchema.parse(customer);
    },
  );

  server.post(
    "/api/admin/customers/:slug/contacts/:contactReference/portal-link",
    { config: { access: adminCustomerManageAccess } },
    async (request) => {
      const { contactReference, slug } = request.params as {
        contactReference: string;
        slug: string;
      };
      const payload = adminLinkCustomerContactPortalRequestSchema.parse(
        request.body,
      );
      const actor = getAuthenticatedActor(request);
      const customer =
        await dependencies.adminCustomerWriteService.linkContactPortal(
          slug,
          contactReference,
          actor.userId,
          payload,
          new Date(),
        );
      if (!customer) throw customerNotFound(slug);
      return adminCustomerDetailSchema.parse(customer);
    },
  );

  server.delete(
    "/api/admin/customers/:slug/contacts/:contactReference/portal-link",
    { config: { access: adminCustomerManageAccess } },
    async (request) => {
      const { contactReference, slug } = request.params as {
        contactReference: string;
        slug: string;
      };
      const actor = getAuthenticatedActor(request);
      const customer =
        await dependencies.adminCustomerWriteService.unlinkContactPortal(
          slug,
          contactReference,
          actor.userId,
          new Date(),
        );
      if (!customer) throw customerNotFound(slug);
      return adminCustomerDetailSchema.parse(customer);
    },
  );

  server.post(
    "/api/admin/customers/:slug/addresses",
    { config: { access: adminCustomerManageAccess } },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const payload = adminCreateCustomerAddressRequestSchema.parse(
        request.body,
      );
      const customer = await dependencies.adminCustomerWriteService.addAddress(
        slug,
        getAuthenticatedUserId(request),
        payload,
        new Date(),
      );
      if (!customer) throw customerNotFound(slug);
      return adminCustomerDetailSchema.parse(customer);
    },
  );
}
