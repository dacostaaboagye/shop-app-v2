import {
  adminCreateSupplierContactRequestSchema,
  adminLinkSupplierContactPortalRequestSchema,
  adminSupplierDetailSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import {
  getAuthenticatedActor,
  getAuthenticatedUserId,
} from "../auth/auth-route-support.js";
import {
  type AdminSupplierRouteDependencies,
  supplierContactNotFound,
  supplierNotFound,
  supplierPrimaryContactCannotBeRemoved,
} from "./admin-supplier-route-support.js";

export function registerAdminSupplierContactRoutes(
  server: FastifyInstance,
  dependencies: AdminSupplierRouteDependencies,
  access: { kind: "permission"; permission: string },
) {
  server.post(
    "/api/admin/suppliers/:slug/contacts",
    { config: { access } },
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

  server.delete(
    "/api/admin/suppliers/:slug/contacts/:contactReference",
    { config: { access } },
    async (request) => {
      const { contactReference, slug } = request.params as {
        contactReference: string;
        slug: string;
      };
      const result = await dependencies.adminSupplierWriteService.removeContact(
        slug,
        contactReference,
      );
      if (result === "primary_contact") {
        throw supplierPrimaryContactCannotBeRemoved();
      }
      if (result === "not_found") {
        throw supplierContactNotFound(slug, contactReference);
      }
      return { success: true };
    },
  );

  server.post(
    "/api/admin/suppliers/:slug/contacts/:contactReference/portal-link",
    { config: { access } },
    async (request) => {
      const { contactReference, slug } = request.params as {
        contactReference: string;
        slug: string;
      };
      const payload = adminLinkSupplierContactPortalRequestSchema.parse(
        request.body,
      );
      const actor = getAuthenticatedActor(request);
      const supplier =
        await dependencies.adminSupplierWriteService.linkContactPortal(
          slug,
          contactReference,
          actor,
          payload,
          new Date(),
        );
      if (!supplier) throw supplierNotFound(slug);
      return adminSupplierDetailSchema.parse(supplier);
    },
  );

  server.post(
    "/api/admin/suppliers/:slug/contacts/:contactReference/portal-invite",
    { config: { access } },
    async (request) => {
      const { contactReference, slug } = request.params as {
        contactReference: string;
        slug: string;
      };
      const actor = getAuthenticatedActor(request);
      const supplier =
        await dependencies.adminSupplierWriteService.inviteContactPortal(
          slug,
          contactReference,
          actor,
          new Date(),
        );
      if (!supplier) throw supplierNotFound(slug);
      return adminSupplierDetailSchema.parse(supplier);
    },
  );

  server.delete(
    "/api/admin/suppliers/:slug/contacts/:contactReference/portal-link",
    { config: { access } },
    async (request) => {
      const { contactReference, slug } = request.params as {
        contactReference: string;
        slug: string;
      };
      const actor = getAuthenticatedActor(request);
      const supplier =
        await dependencies.adminSupplierWriteService.unlinkContactPortal(
          slug,
          contactReference,
          actor,
          new Date(),
        );
      if (!supplier) throw supplierNotFound(slug);
      return adminSupplierDetailSchema.parse(supplier);
    },
  );
}
