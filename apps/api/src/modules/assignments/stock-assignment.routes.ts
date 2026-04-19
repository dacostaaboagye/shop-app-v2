import {
  assignVariantRequestSchema,
  batchAssignVariantRequestSchema,
  batchAssignVariantResponseSchema,
  handoverResponseSchema,
  initiateHandoverRequestSchema,
  locationAssignmentListQuerySchema,
  locationAssignmentListResponseSchema,
  ownershipEventResponseSchema,
  reassignVariantRequestSchema,
  revertHandoverRequestSchema,
  workerAssignmentListQuerySchema,
  workerAssignmentListResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { OwnershipEventWriteService } from "../inventory-ownership/ownership-event-write.service.js";
import type { OwnershipHandoverService } from "../inventory-ownership/ownership-handover.service.js";
import type { PostgresOwnershipHandoverRepository } from "../inventory-ownership/postgres-ownership-handover.repository.js";
import type { PostgresWorkerAssignmentQueryRepository } from "./postgres-worker-assignment-query.repository.js";

type StockBalanceRepository = {
  getOnHandQuantity(skuId: string, locationId: string): Promise<number | null>;
};

type StockAssignmentRouteDependencies = {
  assignmentQueryRepository: Pick<
    PostgresWorkerAssignmentQueryRepository,
    "getWorkerAssignments" | "getLocationAssignments" | "getLocationStaff"
  >;
  handoverRepository: Pick<
    PostgresOwnershipHandoverRepository,
    "getOriginalWorkerForChain"
  >;
  ownershipEventWriteService: Pick<
    OwnershipEventWriteService,
    "assignProduct" | "reassignProduct"
  >;
  ownershipHandoverService: Pick<
    OwnershipHandoverService,
    "initiateHandover" | "endHandover"
  >;
  stockBalanceRepository: StockBalanceRepository;
};

const managerAssignRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.assignments.manage", scope: "any_active" },
  method: "POST",
  url: "/api/manager/assignments",
};

const managerBatchAssignRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.assignments.manage", scope: "any_active" },
  method: "POST",
  url: "/api/manager/assignments/batch",
};

const managerReassignRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.assignments.manage", scope: "any_active" },
  method: "POST",
  url: "/api/manager/assignments/reassign",
};

const managerListAssignmentsRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.assignments.view", scope: "any_active" },
  method: "GET",
  url: "/api/manager/assignments",
};

const managerInitiateHandoverRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.assignments.manage", scope: "any_active" },
  method: "POST",
  url: "/api/manager/handovers",
};

const managerRevertHandoverRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.assignments.manage", scope: "any_active" },
  method: "POST",
  url: "/api/manager/handovers/revert",
};

const workerAssignmentsRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.assignments.own.view", scope: "any_active" },
  method: "GET",
  url: "/api/worker/assignments",
};

const workerInitiateHandoverRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.handovers.manage", scope: "any_active" },
  method: "POST",
  url: "/api/worker/handovers",
};

const workerRevertHandoverRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.handovers.manage", scope: "any_active" },
  method: "POST",
  url: "/api/worker/handovers/revert",
};

export function registerStockAssignmentRoutes(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: managerAssignRoute.access },
    method: managerAssignRoute.method,
    url: managerAssignRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = assignVariantRequestSchema.parse(request.body);
      const result =
        await dependencies.ownershipEventWriteService.assignProduct({
          assignedBy: userId,
          locationId: body.locationId,
          ...(body.effectiveFrom ? { now: new Date(body.effectiveFrom) } : {}),
          quantity: body.quantity,
          skuId: body.skuId,
          workerId: body.workerId,
        });
      return {
        event: ownershipEventResponseSchema.parse(toEventResponse(result.event)),
        status: result.status,
      };
    },
  });

  server.route({
    config: { access: managerBatchAssignRoute.access },
    method: managerBatchAssignRoute.method,
    url: managerBatchAssignRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = batchAssignVariantRequestSchema.parse(request.body);

      for (const item of body.items) {
        const onHand = await dependencies.stockBalanceRepository.getOnHandQuantity(
          item.skuId,
          body.locationId,
        );
        if (onHand === null || onHand === 0) {
          throw new AppError({
            code: "validation_error",
            detail: `SKU ${item.skuId} has no stock at this location and cannot be assigned.`,
            statusCode: 400,
            title: "No stock at location",
          });
        }
        if (item.quantity > onHand) {
          throw new AppError({
            code: "conflict",
            detail: `Requested quantity ${item.quantity} exceeds the ${onHand} units available at this location.`,
            details: { onHandQuantity: onHand, requestedQuantity: item.quantity, skuId: item.skuId },
            statusCode: 409,
            title: "Quantity exceeds stock",
          });
        }
      }

      for (const item of body.items) {
        await dependencies.ownershipEventWriteService.assignProduct({
          assignedBy: userId,
          locationId: body.locationId,
          quantity: item.quantity,
          skuId: item.skuId,
          workerId: body.workerId,
        });
      }
      return batchAssignVariantResponseSchema.parse({
        assignedCount: body.items.length,
        locationId: body.locationId,
        workerId: body.workerId,
      });
    },
  });

  server.route({
    config: { access: managerReassignRoute.access },
    method: managerReassignRoute.method,
    url: managerReassignRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = reassignVariantRequestSchema.parse(request.body);
      const result =
        await dependencies.ownershipEventWriteService.reassignProduct({
          locationId: body.locationId,
          newWorkerId: body.toWorkerId,
          reassignedBy: userId,
          skuId: body.skuId,
        });
      return {
        event: ownershipEventResponseSchema.parse(toEventResponse(result.event)),
        status: result.status,
      };
    },
  });

  server.route({
    config: { access: managerListAssignmentsRoute.access },
    method: managerListAssignmentsRoute.method,
    url: managerListAssignmentsRoute.url,
    async handler(request) {
      const query = locationAssignmentListQuerySchema.parse(request.query);
      const assignments =
        await dependencies.assignmentQueryRepository.getLocationAssignments(
          query.locationId,
        );
      return locationAssignmentListResponseSchema.parse({
        items: assignments.map((a) => ({
          effectiveFrom: a.effectiveFrom.toISOString(),
          eventType: a.eventType,
          productName: a.productName,
          quantity: a.quantity,
          sku: a.sku,
          skuId: a.skuId,
          variantName: a.variantName,
          workerEmail: a.workerEmail,
          workerId: a.workerId,
          workerName: a.workerName,
        })),
        locationId: query.locationId,
        locationName: "",
      });
    },
  });

  server.route({
    config: { access: managerInitiateHandoverRoute.access },
    method: managerInitiateHandoverRoute.method,
    url: managerInitiateHandoverRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = initiateHandoverRequestSchema.parse(request.body);
      if (!body.fromWorkerId) {
        throw new AppError({
          code: "validation_error",
          detail: "fromWorkerId is required for manager-initiated handovers.",
          statusCode: 400,
          title: "Missing fromWorkerId",
        });
      }
      const result =
        await dependencies.ownershipHandoverService.initiateHandover({
          fromWorkerId: body.fromWorkerId,
          initiatedBy: userId,
          locationId: body.locationId,
          skuId: body.skuId,
          toWorkerId: body.toWorkerId,
        });
      return handoverResponseSchema.parse({
        handoverChainId: result.handoverChainId,
        handoverInEvent: toEventResponse(result.handoverInEvent),
        handoverOutEvent: toEventResponse(result.handoverOutEvent),
      });
    },
  });

  server.route({
    config: { access: managerRevertHandoverRoute.access },
    method: managerRevertHandoverRoute.method,
    url: managerRevertHandoverRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = revertHandoverRequestSchema.parse(request.body);

      const originalWorkerId = await resolveOriginalWorker(
        dependencies,
        body.handoverChainId,
      );
      const result = await dependencies.ownershipHandoverService.endHandover({
        endedBy: userId,
        handoverChainId: body.handoverChainId,
        originalWorkerId,
      });
      return {
        event: ownershipEventResponseSchema.parse(toEventResponse(result.event)),
        status: result.status,
      };
    },
  });

  server.route({
    config: { access: workerAssignmentsRoute.access },
    method: workerAssignmentsRoute.method,
    url: workerAssignmentsRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const query = workerAssignmentListQuerySchema.parse(request.query);
      const assignments =
        await dependencies.assignmentQueryRepository.getWorkerAssignments({
          locationId: query.locationId,
          workerId: userId,
        });
      return workerAssignmentListResponseSchema.parse({
        items: assignments.map((a) => ({
          availableQuantity: a.availableQuantity,
          effectiveFrom: a.effectiveFrom.toISOString(),
          locationId: a.locationId,
          onHandQuantity: a.onHandQuantity,
          productName: a.productName,
          productSlug: a.productSlug,
          quantity: a.quantity,
          sellingPrice: a.sellingPrice,
          sku: a.sku,
          skuId: a.skuId,
          variantName: a.variantName,
          variantSlug: a.variantSlug,
          workerId: a.workerId,
        })),
        locationId: query.locationId,
        locationName: "",
      });
    },
  });

  server.route({
    config: { access: workerInitiateHandoverRoute.access },
    method: workerInitiateHandoverRoute.method,
    url: workerInitiateHandoverRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = initiateHandoverRequestSchema.parse(request.body);
      const result =
        await dependencies.ownershipHandoverService.initiateHandover({
          fromWorkerId: userId,
          initiatedBy: userId,
          locationId: body.locationId,
          skuId: body.skuId,
          toWorkerId: body.toWorkerId,
        });
      return handoverResponseSchema.parse({
        handoverChainId: result.handoverChainId,
        handoverInEvent: toEventResponse(result.handoverInEvent),
        handoverOutEvent: toEventResponse(result.handoverOutEvent),
      });
    },
  });

  server.route({
    config: { access: workerRevertHandoverRoute.access },
    method: workerRevertHandoverRoute.method,
    url: workerRevertHandoverRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = revertHandoverRequestSchema.parse(request.body);

      const originalWorkerId = await resolveOriginalWorker(
        dependencies,
        body.handoverChainId,
      );
      const result = await dependencies.ownershipHandoverService.endHandover({
        endedBy: userId,
        handoverChainId: body.handoverChainId,
        originalWorkerId,
      });
      return {
        event: ownershipEventResponseSchema.parse(toEventResponse(result.event)),
        status: result.status,
      };
    },
  });
}

async function resolveOriginalWorker(
  dependencies: StockAssignmentRouteDependencies,
  handoverChainId: string,
): Promise<string> {
  const originalWorkerId =
    await dependencies.handoverRepository.getOriginalWorkerForChain(
      handoverChainId,
    );

  if (!originalWorkerId) {
    throw new AppError({
      code: "not_found",
      detail: `No handover chain exists for ${handoverChainId}.`,
      statusCode: 404,
      title: "Handover chain not found",
    });
  }

  return originalWorkerId;
}

function toEventResponse(event: {
  createdAt: Date;
  effectiveFrom: Date;
  eventType: string;
  handoverChainId: string | null;
  locationId: string;
  quantity: number;
  skuId: string;
  workerId: string;
}) {
  return {
    createdAt: event.createdAt.toISOString(),
    effectiveFrom: event.effectiveFrom.toISOString(),
    eventType: event.eventType,
    handoverChainId: event.handoverChainId,
    locationId: event.locationId,
    quantity: event.quantity,
    skuId: event.skuId,
    workerId: event.workerId,
  };
}

function createUnavailableDependencies(): StockAssignmentRouteDependencies {
  const unavailable = (): never => {
    throw new AppError({
      code: "internal_error",
      detail: "Assignment services are not configured for this environment.",
      statusCode: 503,
      title: "Assignment services unavailable",
    });
  };

  return {
    assignmentQueryRepository: {
      async getWorkerAssignments() {
        return unavailable();
      },
      async getLocationAssignments() {
        return unavailable();
      },
      async getLocationStaff() {
        return unavailable();
      },
    },
    handoverRepository: {
      async getOriginalWorkerForChain() {
        return unavailable();
      },
    },
    ownershipEventWriteService: {
      async assignProduct() {
        return unavailable();
      },
      async reassignProduct() {
        return unavailable();
      },
    },
    ownershipHandoverService: {
      async initiateHandover() {
        return unavailable();
      },
      async endHandover() {
        return unavailable();
      },
    },
    stockBalanceRepository: {
      async getOnHandQuantity() {
        return unavailable();
      },
    },
  };
}
