import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type {
  GtnRow,
  PostgresSupplyRequestRepository,
  SupplyRequestRow,
} from "./postgres-supply-request.repository.js";
import type { StockSupplyService } from "./stock-supply.service.js";

export type StockSupplyRouteDependencies = {
  locationRepository: {
    listActiveLocations(): Promise<{ id: string; name: string }[]>;
  };
  permissionService: Pick<
    PermissionResolutionService,
    | "assertHasPermission"
    | "resolveAllPermissions"
    | "resolvePermissionsForAnyScope"
  >;
  referenceNumberService: Pick<ReferenceNumberService, "generateReference">;
  supplyRequestRepository: Pick<
    PostgresSupplyRequestRepository,
    | "findById"
    | "findGtnById"
    | "findGtnBySupplyRequest"
    | "listByLocation"
    | "listByRequester"
    | "listBySourceLocations"
    | "listBySourceLocation"
  >;
  supplyService: Pick<
    StockSupplyService,
    | "approve"
    | "cancel"
    | "cancelById"
    | "confirmReceipt"
    | "createRequestBatch"
    | "createRequest"
    | "dispatch"
    | "reject"
  >;
  variantSnapshotRepository: {
    getVariantSnapshot(skuId: string): Promise<{
      productName: string;
      sku: string;
      variantName: string;
    } | null>;
  };
};

export const supplyRequestRoutes = {
  getGtn: supplyRoute("GET", "/api/stock/gtns/:id", "stock.supply.request"),
  managerApprove: supplyRoute(
    "PATCH",
    "/api/manager/stock/supply-requests/:id/approve",
    "stock.supply.manage",
  ),
  managerCreate: supplyRoute(
    "POST",
    "/api/manager/stock/supply-requests",
    "stock.supply.manage",
  ),
  managerCreateBatch: supplyRoute(
    "POST",
    "/api/manager/stock/supply-requests/batch",
    "stock.supply.manage",
  ),
  managerDispatch: supplyRoute(
    "PATCH",
    "/api/manager/stock/supply-requests/:id/dispatch",
    "stock.supply.manage",
  ),
  managerIncoming: supplyRoute(
    "GET",
    "/api/manager/stock/supply-requests/incoming",
    "stock.supply.manage",
  ),
  managerList: supplyRoute(
    "GET",
    "/api/manager/stock/supply-requests",
    "stock.supply.manage",
  ),
  managerReject: supplyRoute(
    "PATCH",
    "/api/manager/stock/supply-requests/:id/reject",
    "stock.supply.manage",
  ),
  managerSourceLocations: supplyRoute(
    "GET",
    "/api/manager/stock/supply-request-sources",
    "stock.supply.manage",
  ),
  workerCancel: supplyRoute(
    "PATCH",
    "/api/worker/stock/supply-requests/:id/cancel",
    "stock.supply.request",
  ),
  workerConfirmReceipt: supplyRoute(
    "PATCH",
    "/api/worker/stock/supply-requests/:id/confirm-receipt",
    "stock.supply.request",
  ),
  workerCreate: supplyRoute(
    "POST",
    "/api/worker/stock/supply-requests",
    "stock.supply.request",
  ),
  workerCreateBatch: supplyRoute(
    "POST",
    "/api/worker/stock/supply-requests/batch",
    "stock.supply.request",
  ),
  workerList: supplyRoute(
    "GET",
    "/api/worker/stock/supply-requests",
    "stock.supply.request",
  ),
  workerSourceLocations: supplyRoute(
    "GET",
    "/api/worker/stock/supply-request-sources",
    "stock.supply.request",
  ),
} satisfies Record<string, RouteDefinition>;

export function toRequestResponse(row: SupplyRequestRow) {
  return {
    approvedQuantity: row.approvedQuantity,
    createdAt: row.createdAt.toISOString(),
    dispatchedAt: row.dispatchedAt?.toISOString() ?? null,
    dispatchedBy: row.dispatchedBy,
    gtnReference: row.gtnReference,
    locationId: row.locationId,
    locationName: row.locationName,
    notes: row.notes,
    receivedAt: row.receivedAt?.toISOString() ?? null,
    receivedQuantity: row.receivedQuantity,
    reference: row.reference,
    receiptDiscrepancyNotes: row.receiptDiscrepancyNotes,
    receiptDiscrepancyReason: row.receiptDiscrepancyReason,
    requestGroupReference: row.requestGroupReference,
    sourceReservationStatus: row.sourceReservationStatus,
    requesterEmail: row.requesterEmail,
    requesterId: row.requesterId,
    requesterName: row.requesterName,
    requestedQuantity: row.requestedQuantity,
    resolutionNotes: row.resolutionNotes,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedBy: row.resolvedBy,
    skuId: row.skuId,
    skuSnapshot: row.skuSnapshot,
    sourceLocationId: row.sourceLocationId,
    sourceLocationName: row.sourceLocationName,
    status: row.status,
    supplyRequestId: row.id,
    transferReference: row.transferReference,
  };
}

export function toGtnResponse(gtn: GtnRow) {
  return {
    createdAt: gtn.createdAt.toISOString(),
    destinationLocationId: gtn.destinationLocationId,
    destinationLocationName: gtn.destinationLocationName,
    dispatchedAt: gtn.dispatchedAt.toISOString(),
    dispatchedBy: gtn.dispatchedBy,
    dispatchedByName: gtn.dispatchedByName,
    gtnId: gtn.id,
    notes: gtn.notes,
    quantity: gtn.quantity,
    receivedAt: gtn.receivedAt?.toISOString() ?? null,
    receivedBy: gtn.receivedBy,
    receivedByName: gtn.receivedByName,
    receivedQuantity: gtn.receivedQuantity,
    reference: gtn.reference,
    receiptDiscrepancyNotes: gtn.receiptDiscrepancyNotes,
    receiptDiscrepancyReason: gtn.receiptDiscrepancyReason,
    skuId: gtn.skuId,
    skuSnapshot: gtn.skuSnapshot,
    sourceLocationId: gtn.sourceLocationId,
    sourceLocationName: gtn.sourceLocationName,
    status: gtn.status,
    supplyRequestId: gtn.supplyRequestId,
    supplyRequestReference: gtn.supplyRequestReference,
  };
}

export function getAuthenticatedActor(request: {
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

function supplyRoute(
  method: RouteDefinition["method"],
  url: string,
  permission: string,
): RouteDefinition {
  return {
    access: { kind: "permission", permission, scope: "any_active" },
    method,
    url,
  };
}
