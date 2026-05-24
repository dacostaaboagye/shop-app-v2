import {
  createManualInvoiceRequestSchema,
  decideManualInvoiceRequestSchema,
  manualInvoiceRequestResponseSchema,
  rejectManualInvoiceRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import {
  getAuthenticatedActor,
  getAuthenticatedUserId,
} from "../auth/auth-route-support.js";
import type { SalesIssuedDocumentSnapshotService } from "../official-documents/sales-issued-document-snapshot.service.js";
import { toManualInvoiceRequestResponse } from "./manual-invoice-request.mapper.js";
import type { ManualInvoiceRequestService } from "./manual-invoice-request.service.js";
import type { ManualInvoiceRequestRepository } from "./manual-invoice-request.types.js";
import { manualInvoiceRequestRoutes } from "./manual-invoice-request-route-definitions.js";
import {
  assertHasLocationPermission,
  createUnavailableDependencies,
  getManualInvoiceRequest,
  listManualInvoiceRequests,
} from "./manual-invoice-request-route-support.js";

export type ManualInvoiceRequestRouteDependencies = {
  manualInvoiceRequestRepository: Pick<
    ManualInvoiceRequestRepository,
    "findByReference" | "listByLocations"
  >;
  manualInvoiceRequestService: Pick<
    ManualInvoiceRequestService,
    "approveRequest" | "createRequest" | "getRequestOrThrow" | "rejectRequest"
  >;
  permissionService: Pick<
    PermissionResolutionService,
    "assertHasPermission" | "resolveAllPermissions"
  >;
  salesDocumentSnapshotService?: Pick<
    SalesIssuedDocumentSnapshotService,
    "getOrIssueSnapshot"
  >;
};

export function registerManualInvoiceRequestRoutes(
  server: FastifyInstance,
  dependencies: ManualInvoiceRequestRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: manualInvoiceRequestRoutes.managerCreate.access },
    method: manualInvoiceRequestRoutes.managerCreate.method,
    url: manualInvoiceRequestRoutes.managerCreate.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = createManualInvoiceRequestSchema.parse(request.body);
      await assertHasLocationPermission({
        dependencies,
        locationId: body.locationId,
        permission: "invoices.manual.request",
        userId,
      });
      const result =
        await dependencies.manualInvoiceRequestService.createRequest({
          createdBy: userId,
          ...(body.customerBillingAddressLines !== undefined
            ? { customerBillingAddressLines: body.customerBillingAddressLines }
            : {}),
          ...(body.customerContactReference !== undefined
            ? { customerContactReference: body.customerContactReference }
            : {}),
          ...(body.customerEmail !== undefined
            ? { customerEmail: body.customerEmail }
            : {}),
          ...(body.customerName !== undefined
            ? { customerName: body.customerName }
            : {}),
          ...(body.customerPhone !== undefined
            ? { customerPhone: body.customerPhone }
            : {}),
          ...(body.customerSlug !== undefined
            ? { customerSlug: body.customerSlug }
            : {}),
          ...(body.customerTaxNumber !== undefined
            ? { customerTaxNumber: body.customerTaxNumber }
            : {}),
          lines: body.lines,
          locationId: body.locationId,
          ...(body.paymentMethod !== undefined
            ? { paymentMethod: body.paymentMethod }
            : {}),
          reason: body.reason,
          ...(body.supportingNote !== undefined
            ? { supportingNote: body.supportingNote }
            : {}),
        });

      return manualInvoiceRequestResponseSchema.parse(
        toManualInvoiceRequestResponse(result),
      );
    },
  });

  server.route({
    config: { access: manualInvoiceRequestRoutes.managerList.access },
    method: manualInvoiceRequestRoutes.managerList.method,
    url: manualInvoiceRequestRoutes.managerList.url,
    async handler(request) {
      return listManualInvoiceRequests({
        dependencies,
        permission: "invoices.manual.view",
        query: request.query,
        userId: getAuthenticatedUserId(request),
      });
    },
  });

  server.route({
    config: { access: manualInvoiceRequestRoutes.managerGet.access },
    method: manualInvoiceRequestRoutes.managerGet.method,
    url: manualInvoiceRequestRoutes.managerGet.url,
    async handler(request) {
      return getManualInvoiceRequest({
        dependencies,
        params: request.params,
        permission: "invoices.manual.view",
        userId: getAuthenticatedUserId(request),
      });
    },
  });

  server.route({
    config: { access: manualInvoiceRequestRoutes.adminList.access },
    method: manualInvoiceRequestRoutes.adminList.method,
    url: manualInvoiceRequestRoutes.adminList.url,
    async handler(request) {
      return listManualInvoiceRequests({
        dependencies,
        permission: "invoices.manual.view",
        query: request.query,
        userId: getAuthenticatedUserId(request),
      });
    },
  });

  server.route({
    config: { access: manualInvoiceRequestRoutes.adminGet.access },
    method: manualInvoiceRequestRoutes.adminGet.method,
    url: manualInvoiceRequestRoutes.adminGet.url,
    async handler(request) {
      return getManualInvoiceRequest({
        dependencies,
        params: request.params,
        permission: "invoices.manual.view",
        userId: getAuthenticatedUserId(request),
      });
    },
  });

  server.route({
    config: { access: manualInvoiceRequestRoutes.adminApprove.access },
    method: manualInvoiceRequestRoutes.adminApprove.method,
    url: manualInvoiceRequestRoutes.adminApprove.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const { reference } = request.params as { reference: string };
      const body = decideManualInvoiceRequestSchema.parse(request.body);
      const pending =
        await dependencies.manualInvoiceRequestService.getRequestOrThrow(
          reference,
        );
      await assertHasLocationPermission({
        dependencies,
        locationId: pending.locationId,
        permission: "invoices.manual.approve",
        userId: actor.userId,
      });
      const result =
        await dependencies.manualInvoiceRequestService.approveRequest({
          actorUserId: actor.userId,
          note: body.note ?? null,
          reference,
        });
      await dependencies.salesDocumentSnapshotService?.getOrIssueSnapshot({
        actorUserId: actor.userId,
        actorUserSlug: actor.userSlug,
        reference: result.invoice.reference,
      });

      return manualInvoiceRequestResponseSchema.parse(
        toManualInvoiceRequestResponse(result.request),
      );
    },
  });

  server.route({
    config: { access: manualInvoiceRequestRoutes.adminReject.access },
    method: manualInvoiceRequestRoutes.adminReject.method,
    url: manualInvoiceRequestRoutes.adminReject.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const { reference } = request.params as { reference: string };
      const body = rejectManualInvoiceRequestSchema.parse(request.body);
      const pending =
        await dependencies.manualInvoiceRequestService.getRequestOrThrow(
          reference,
        );
      await assertHasLocationPermission({
        dependencies,
        locationId: pending.locationId,
        permission: "invoices.manual.approve",
        userId,
      });
      const result =
        await dependencies.manualInvoiceRequestService.rejectRequest({
          actorUserId: userId,
          reason: body.reason,
          reference,
        });

      return manualInvoiceRequestResponseSchema.parse(
        toManualInvoiceRequestResponse(result),
      );
    },
  });
}
