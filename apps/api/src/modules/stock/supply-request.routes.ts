import {
  approveStockSupplyRequestSchema,
  confirmReceiptSchema,
  createStockSupplyRequestSchema,
  dispatchStockSupplyRequestSchema,
  gtnResponseSchema,
  rejectStockSupplyRequestSchema,
  supplyRequestSourceListQuerySchema,
  supplyRequestSourceListResponseSchema,
  stockSupplyRequestListQuerySchema,
  stockSupplyRequestListResponseSchema,
  stockSupplyRequestResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type {
  GtnRow,
  PostgresSupplyRequestRepository,
  SupplyRequestRow,
} from "./postgres-supply-request.repository.js";
import { SupplyRequestAccessPolicy } from "./supply-request-access-policy.js";
import type { StockSupplyService } from "./stock-supply.service.js";

type StockSupplyRouteDependencies = {
  locationRepository: {
    listActiveLocations(): Promise<{ id: string; name: string }[]>;
  };
  permissionService: Pick<
    PermissionResolutionService,
    "assertHasPermission" | "resolvePermissionsForAnyScope"
  >;
  referenceNumberService: Pick<ReferenceNumberService, "generateReference">;
  supplyRequestRepository: Pick<
    PostgresSupplyRequestRepository,
    | "findGtnById"
    | "findGtnBySupplyRequest"
    | "findById"
    | "listByRequester"
    | "listBySourceLocation"
  >;
  supplyService: Pick<
    StockSupplyService,
    | "approve"
    | "cancel"
    | "cancelById"
    | "confirmReceipt"
    | "createRequest"
    | "dispatch"
    | "reject"
  >;
  variantSnapshotRepository: {
    getVariantSnapshot(
      skuId: string,
    ): Promise<{ sku: string; productName: string; variantName: string } | null>;
  };
};

// Worker: create a request (any location can be source)
const workerCreateRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.supply.request", scope: "any_active" },
  method: "POST",
  url: "/api/worker/stock/supply-requests",
};

// Worker: list own requests
const workerListRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.supply.request", scope: "any_active" },
  method: "GET",
  url: "/api/worker/stock/supply-requests",
};

// Worker: cancel a pending/approved request
const workerCancelRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.supply.request", scope: "any_active" },
  method: "PATCH",
  url: "/api/worker/stock/supply-requests/:id/cancel",
};

// Worker: confirm receipt of dispatched goods (updates destination stock)
const workerConfirmReceiptRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.supply.request", scope: "any_active" },
  method: "PATCH",
  url: "/api/worker/stock/supply-requests/:id/confirm-receipt",
};

// Manager: list incoming requests to their location (source_location_id = their scope)
const managerIncomingRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.supply.manage", scope: "any_active" },
  method: "GET",
  url: "/api/manager/stock/supply-requests/incoming",
};

// Manager: approve a pending request with quantity they can send
const managerApproveRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.supply.manage", scope: "any_active" },
  method: "PATCH",
  url: "/api/manager/stock/supply-requests/:id/approve",
};

// Manager: reject a pending request
const managerRejectRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.supply.manage", scope: "any_active" },
  method: "PATCH",
  url: "/api/manager/stock/supply-requests/:id/reject",
};

// Manager: dispatch approved goods (deducts from source stock, creates GTN)
const managerDispatchRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.supply.manage", scope: "any_active" },
  method: "PATCH",
  url: "/api/manager/stock/supply-requests/:id/dispatch",
};

// Get GTN by id
const getGtnRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.supply.request", scope: "any_active" },
  method: "GET",
  url: "/api/stock/gtns/:id",
};

// List active locations (used by workers to pick source location when creating a request)
const workerSourceLocationsRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.supply.request", scope: "any_active" },
  method: "GET",
  url: "/api/worker/stock/supply-request-sources",
};

export function registerStockSupplyRoutes(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies = createUnavailableDependencies(),
) {
  const accessPolicy = new SupplyRequestAccessPolicy(
    dependencies.permissionService,
  );

  // Worker: create supply request
  server.route({
    config: { access: workerCreateRoute.access },
    method: workerCreateRoute.method,
    url: workerCreateRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const body = createStockSupplyRequestSchema.parse(request.body);

      if (body.sourceLocationId === body.locationId) {
        throw new AppError({
          code: "validation_error",
          detail: "Source and destination locations must be different.",
          statusCode: 400,
          title: "Invalid locations",
        });
      }

      await accessPolicy.assertCanCreateRequest({
        actor,
        destinationLocationId: body.locationId,
      });

      const snapshot = await dependencies.variantSnapshotRepository.getVariantSnapshot(
        body.skuId,
      );
      if (!snapshot) {
        throw new AppError({
          code: "not_found",
          detail: `SKU ${body.skuId} does not exist or is not active.`,
          statusCode: 404,
          title: "SKU not found",
        });
      }

      const reference = await dependencies.referenceNumberService.generateReference({
        sequenceKey: "supply-request",
      });

      const row = await dependencies.supplyService.createRequest({
        actor,
        locationId: body.locationId,
        notes: body.notes ?? null,
        reference,
        requestedQuantity: body.requestedQuantity,
        requesterId: userId,
        skuId: body.skuId,
        skuSnapshot: snapshot,
        sourceLocationId: body.sourceLocationId,
      });

      return stockSupplyRequestResponseSchema.parse(toRequestResponse(row));
    },
  });

  // Worker: list own requests
  server.route({
    config: { access: workerListRoute.access },
    method: workerListRoute.method,
    url: workerListRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const query = stockSupplyRequestListQuerySchema.parse(request.query);
      const result = await dependencies.supplyRequestRepository.listByRequester({
        page: query.page,
        pageSize: query.pageSize,
        requesterId: userId,
        ...(query.status ? { status: query.status } : {}),
      });
      return stockSupplyRequestListResponseSchema.parse({
        items: result.items.map(toRequestResponse),
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
      });
    },
  });

  // Worker: cancel request
  server.route({
    config: { access: workerCancelRoute.access },
    method: workerCancelRoute.method,
    url: workerCancelRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const { id } = request.params as { id: string };
      const existingRequest = await dependencies.supplyRequestRepository.findById(id);
      if (!existingRequest) {
        throw new AppError({
          code: "not_found",
          detail: "Request not found or cannot be cancelled at this stage.",
          statusCode: 404,
          title: "Cannot cancel",
        });
      }
      await accessPolicy.assertCanCancelRequest({
        actor,
        supplyRequest: existingRequest,
      });
      const row =
        existingRequest.requesterId === userId
          ? await dependencies.supplyService.cancel({
              actor,
              id,
              now: new Date(),
              requesterId: userId,
            })
          : await dependencies.supplyService.cancelById({
              actor,
              id,
              now: new Date(),
            });
      if (!row) {
        throw new AppError({
          code: "not_found",
          detail: "Request not found or cannot be cancelled at this stage.",
          statusCode: 404,
          title: "Cannot cancel",
        });
      }
      return stockSupplyRequestResponseSchema.parse(toRequestResponse(row));
    },
  });

  // Worker: confirm receipt of goods
  server.route({
    config: { access: workerConfirmReceiptRoute.access },
    method: workerConfirmReceiptRoute.method,
    url: workerConfirmReceiptRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const { id } = request.params as { id: string };
      const body = confirmReceiptSchema.parse(request.body);
      const existingRequest = await dependencies.supplyRequestRepository.findById(id);
      if (!existingRequest) {
        throw new AppError({
          code: "not_found",
          detail: "Supply request not found or goods have not been dispatched yet.",
          statusCode: 404,
          title: "Cannot confirm receipt",
        });
      }
      await accessPolicy.assertCanConfirmReceipt({
        actor,
        supplyRequest: existingRequest,
      });
      const { supplyRequest } = await dependencies.supplyService.confirmReceipt({
        actor,
        notes: body.notes ?? null,
        now: new Date(),
        receivedBy: userId,
        supplyRequestId: id,
      });
      return stockSupplyRequestResponseSchema.parse(toRequestResponse(supplyRequest));
    },
  });

  // Manager: list incoming requests to their location
  server.route({
    config: { access: managerIncomingRoute.access },
    method: managerIncomingRoute.method,
    url: managerIncomingRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = stockSupplyRequestListQuerySchema.parse(request.query);
      if (!query.sourceLocationId) {
        throw new AppError({
          code: "validation_error",
          detail: "sourceLocationId is required.",
          statusCode: 400,
          title: "Missing sourceLocationId",
        });
      }
      await accessPolicy.assertCanListIncomingForSource({
        actor,
        sourceLocationId: query.sourceLocationId,
      });
      const result = await dependencies.supplyRequestRepository.listBySourceLocation({
        sourceLocationId: query.sourceLocationId,
        page: query.page,
        pageSize: query.pageSize,
        ...(query.status ? { status: query.status } : {}),
      });
      return stockSupplyRequestListResponseSchema.parse({
        items: result.items.map(toRequestResponse),
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
      });
    },
  });

  // Manager: approve with quantity
  server.route({
    config: { access: managerApproveRoute.access },
    method: managerApproveRoute.method,
    url: managerApproveRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const { id } = request.params as { id: string };
      const body = approveStockSupplyRequestSchema.parse(request.body);
      const existingRequest = await dependencies.supplyRequestRepository.findById(id);
      if (!existingRequest) {
        throw new AppError({
          code: "not_found",
          detail: "Request not found or is not in a pending state.",
          statusCode: 404,
          title: "Cannot approve",
        });
      }
      await accessPolicy.assertCanManageRequest({
        actor,
        supplyRequest: existingRequest,
      });
      const row = await dependencies.supplyService.approve({
        actor,
        id,
        approvedQuantity: body.approvedQuantity,
        now: new Date(),
        resolutionNotes: body.resolutionNotes ?? null,
        resolvedBy: userId,
      });
      if (!row) {
        throw new AppError({
          code: "not_found",
          detail: "Request not found or is not in a pending state.",
          statusCode: 404,
          title: "Cannot approve",
        });
      }
      return stockSupplyRequestResponseSchema.parse(toRequestResponse(row));
    },
  });

  // Manager: reject
  server.route({
    config: { access: managerRejectRoute.access },
    method: managerRejectRoute.method,
    url: managerRejectRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const { id } = request.params as { id: string };
      const body = rejectStockSupplyRequestSchema.parse(request.body);
      const existingRequest = await dependencies.supplyRequestRepository.findById(id);
      if (!existingRequest) {
        throw new AppError({
          code: "not_found",
          detail: "Request not found or is not in a pending state.",
          statusCode: 404,
          title: "Cannot reject",
        });
      }
      await accessPolicy.assertCanManageRequest({
        actor,
        supplyRequest: existingRequest,
      });
      const row = await dependencies.supplyService.reject({
        actor,
        id,
        now: new Date(),
        resolutionNotes: body.resolutionNotes ?? null,
        resolvedBy: userId,
      });
      if (!row) {
        throw new AppError({
          code: "not_found",
          detail: "Request not found or is not in a pending state.",
          statusCode: 404,
          title: "Cannot reject",
        });
      }
      return stockSupplyRequestResponseSchema.parse(toRequestResponse(row));
    },
  });

  // Manager: dispatch (deducts stock, creates GTN)
  server.route({
    config: { access: managerDispatchRoute.access },
    method: managerDispatchRoute.method,
    url: managerDispatchRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const { id } = request.params as { id: string };
      const body = dispatchStockSupplyRequestSchema.parse(request.body);
      const existingRequest = await dependencies.supplyRequestRepository.findById(id);
      if (!existingRequest) {
        throw new AppError({
          code: "not_found",
          detail: "Supply request not found or is not in an approved state.",
          statusCode: 404,
          title: "Cannot dispatch",
        });
      }
      await accessPolicy.assertCanManageRequest({
        actor,
        supplyRequest: existingRequest,
      });
      const { supplyRequest, gtn } = await dependencies.supplyService.dispatch({
        actor,
        dispatchedBy: userId,
        notes: body.notes ?? null,
        now: new Date(),
        supplyRequestId: id,
      });
      return {
        gtn: gtnResponseSchema.parse(toGtnResponse(gtn)),
        supplyRequest: stockSupplyRequestResponseSchema.parse(
          toRequestResponse(supplyRequest),
        ),
      };
    },
  });

  // Get GTN by id (accessible by both worker and manager roles)
  server.route({
    config: { access: getGtnRoute.access },
    method: getGtnRoute.method,
    url: getGtnRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const { id } = request.params as { id: string };
      const gtn = await dependencies.supplyRequestRepository.findGtnById(id);
      if (!gtn) {
        throw new AppError({
          code: "not_found",
          detail: `Goods Transfer Note ${id} not found.`,
          statusCode: 404,
          title: "GTN not found",
        });
      }
      const relatedRequest = await dependencies.supplyRequestRepository.findById(
        gtn.supplyRequestId,
      );
      if (!relatedRequest) {
        throw new AppError({
          code: "not_found",
          detail: `Supply request ${gtn.supplyRequestId} not found for this GTN.`,
          statusCode: 404,
          title: "Supply request not found",
        });
      }
      await accessPolicy.assertCanViewGtn({
        actor,
        gtn,
        supplyRequest: relatedRequest,
      });
      return gtnResponseSchema.parse(toGtnResponse(gtn));
    },
  });

  // List eligible source locations for a destination location
  server.route({
    config: { access: workerSourceLocationsRoute.access },
    method: workerSourceLocationsRoute.method,
    url: workerSourceLocationsRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = supplyRequestSourceListQuerySchema.parse(request.query);
      await accessPolicy.assertCanCreateRequest({
        actor,
        destinationLocationId: query.destinationLocationId,
      });
      const items = await dependencies.locationRepository.listActiveLocations();
      return supplyRequestSourceListResponseSchema.parse({
        items: items
          .filter((location) => location.id !== query.destinationLocationId)
          .map((location) => ({
            locationId: location.id,
            locationName: location.name,
          })),
      });
    },
  });
}

function toRequestResponse(row: SupplyRequestRow) {
  return {
    reference: row.reference,
    supplyRequestId: row.id,
    requesterId: row.requesterId,
    requesterName: row.requesterName,
    requesterEmail: row.requesterEmail,
    locationId: row.locationId,
    locationName: row.locationName,
    sourceLocationId: row.sourceLocationId,
    sourceLocationName: row.sourceLocationName,
    skuId: row.skuId,
    skuSnapshot: row.skuSnapshot,
    requestedQuantity: row.requestedQuantity,
    approvedQuantity: row.approvedQuantity,
    status: row.status,
    notes: row.notes,
    resolutionNotes: row.resolutionNotes,
    resolvedBy: row.resolvedBy,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    dispatchedBy: row.dispatchedBy,
    dispatchedAt: row.dispatchedAt?.toISOString() ?? null,
    receivedAt: row.receivedAt?.toISOString() ?? null,
    gtnReference: row.gtnReference,
    createdAt: row.createdAt.toISOString(),
  };
}

function toGtnResponse(gtn: GtnRow) {
  return {
    gtnId: gtn.id,
    reference: gtn.reference,
    supplyRequestId: gtn.supplyRequestId,
    supplyRequestReference: gtn.supplyRequestReference,
    sourceLocationId: gtn.sourceLocationId,
    sourceLocationName: gtn.sourceLocationName,
    destinationLocationId: gtn.destinationLocationId,
    destinationLocationName: gtn.destinationLocationName,
    skuId: gtn.skuId,
    skuSnapshot: gtn.skuSnapshot,
    quantity: gtn.quantity,
    status: gtn.status,
    dispatchedBy: gtn.dispatchedBy,
    dispatchedByName: gtn.dispatchedByName,
    dispatchedAt: gtn.dispatchedAt.toISOString(),
    receivedBy: gtn.receivedBy,
    receivedByName: gtn.receivedByName,
    receivedAt: gtn.receivedAt?.toISOString() ?? null,
    notes: gtn.notes,
    createdAt: gtn.createdAt.toISOString(),
  };
}

function createUnavailableDependencies(): StockSupplyRouteDependencies {
  const unavailable = (): never => {
    throw new AppError({
      code: "internal_error",
      detail: "Stock supply services are not configured for this environment.",
      statusCode: 503,
      title: "Stock supply unavailable",
    });
  };

  return {
    locationRepository: {
      async listActiveLocations() { return unavailable(); },
    },
    permissionService: {
      async assertHasPermission() {
        return unavailable();
      },
      async resolvePermissionsForAnyScope() {
        return unavailable();
      },
    },
    referenceNumberService: {
      async generateReference() {
        return unavailable();
      },
    },
    supplyRequestRepository: {
      async findGtnById() { return unavailable(); },
      async findGtnBySupplyRequest() { return unavailable(); },
      async findById() { return unavailable(); },
      async listByRequester() { return unavailable(); },
      async listBySourceLocation() { return unavailable(); },
    },
    supplyService: {
      async approve() { return unavailable(); },
      async cancel() { return unavailable(); },
      async cancelById() { return unavailable(); },
      async confirmReceipt() { return unavailable(); },
      async createRequest() { return unavailable(); },
      async dispatch() { return unavailable(); },
      async reject() { return unavailable(); },
    },
    variantSnapshotRepository: {
      async getVariantSnapshot() { return unavailable(); },
    },
  };
}

function getAuthenticatedActor(request: {
  auth?: AuthenticatedActor;
}): AuthenticatedActor {
  if (request.auth) {
    return request.auth;
  }

  throw new AppError({
    code: "internal_error",
    detail: "Authenticated actor context is unavailable for this route.",
    statusCode: 500,
    title: "Authorization unavailable",
  });
}
