import {
  approveStockSupplyRequestSchema,
  confirmReceiptSchema,
  createStockSupplyRequestSchema,
  dispatchStockSupplyRequestSchema,
  gtnResponseSchema,
  rejectStockSupplyRequestSchema,
  stockSupplyRequestListQuerySchema,
  stockSupplyRequestListResponseSchema,
  stockSupplyRequestResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type {
  GtnRow,
  PostgresSupplyRequestRepository,
  SupplyRequestRow,
} from "./postgres-supply-request.repository.js";
import type { StockSupplyService } from "./stock-supply.service.js";

type StockSupplyRouteDependencies = {
  locationRepository: {
    listActiveLocations(): Promise<{ id: string; name: string }[]>;
  };
  referenceNumberService: Pick<ReferenceNumberService, "generateReference">;
  supplyRequestRepository: Pick<
    PostgresSupplyRequestRepository,
    | "approve"
    | "cancel"
    | "create"
    | "findGtnById"
    | "findGtnBySupplyRequest"
    | "findById"
    | "listByRequester"
    | "listBySourceLocation"
    | "reject"
  >;
  supplyService: Pick<StockSupplyService, "dispatch" | "confirmReceipt">;
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
const listLocationsRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.supply.request", scope: "any_active" },
  method: "GET",
  url: "/api/locations",
};

export function registerStockSupplyRoutes(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies = createUnavailableDependencies(),
) {
  // Worker: create supply request
  server.route({
    config: { access: workerCreateRoute.access },
    method: workerCreateRoute.method,
    url: workerCreateRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = createStockSupplyRequestSchema.parse(request.body);

      if (body.sourceLocationId === body.locationId) {
        throw new AppError({
          code: "validation_error",
          detail: "Source and destination locations must be different.",
          statusCode: 400,
          title: "Invalid locations",
        });
      }

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

      const row = await dependencies.supplyRequestRepository.create({
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
      const { id } = request.params as { id: string };
      const row = await dependencies.supplyRequestRepository.cancel({
        id,
        now: new Date(),
        requesterId: userId,
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
      const { id } = request.params as { id: string };
      const body = confirmReceiptSchema.parse(request.body);
      const { supplyRequest } = await dependencies.supplyService.confirmReceipt({
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
      const query = stockSupplyRequestListQuerySchema.parse(request.query);
      if (!query.sourceLocationId) {
        throw new AppError({
          code: "validation_error",
          detail: "sourceLocationId is required.",
          statusCode: 400,
          title: "Missing sourceLocationId",
        });
      }
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
      const { id } = request.params as { id: string };
      const body = approveStockSupplyRequestSchema.parse(request.body);
      const row = await dependencies.supplyRequestRepository.approve({
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
      const { id } = request.params as { id: string };
      const body = rejectStockSupplyRequestSchema.parse(request.body);
      const row = await dependencies.supplyRequestRepository.reject({
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
      const { id } = request.params as { id: string };
      const body = dispatchStockSupplyRequestSchema.parse(request.body);
      const { supplyRequest, gtn } = await dependencies.supplyService.dispatch({
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
      return gtnResponseSchema.parse(toGtnResponse(gtn));
    },
  });

  // List active locations for source location picker
  server.route({
    config: { access: listLocationsRoute.access },
    method: listLocationsRoute.method,
    url: listLocationsRoute.url,
    async handler() {
      const items = await dependencies.locationRepository.listActiveLocations();
      return { items };
    },
  });
}

function toRequestResponse(row: SupplyRequestRow) {
  return {
    id: row.id,
    reference: row.reference,
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
    id: gtn.id,
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
    referenceNumberService: {
      async generateReference() {
        return unavailable();
      },
    },
    supplyRequestRepository: {
      async approve() { return unavailable(); },
      async cancel() { return unavailable(); },
      async create() { return unavailable(); },
      async findGtnById() { return unavailable(); },
      async findGtnBySupplyRequest() { return unavailable(); },
      async findById() { return unavailable(); },
      async listByRequester() { return unavailable(); },
      async listBySourceLocation() { return unavailable(); },
      async reject() { return unavailable(); },
    },
    supplyService: {
      async dispatch() { return unavailable(); },
      async confirmReceipt() { return unavailable(); },
    },
    variantSnapshotRepository: {
      async getVariantSnapshot() { return unavailable(); },
    },
  };
}
