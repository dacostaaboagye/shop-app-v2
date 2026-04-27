import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PostgresOwnershipHandoverRepository } from "../inventory-ownership/postgres-ownership-handover.repository.js";
import type { AssignmentCommandService } from "./assignment-command.service.js";
import type { PostgresWorkerAssignmentQueryRepository } from "./postgres-worker-assignment-query.repository.js";

type StockBalanceRepository = {
  getOnHandQuantity(skuId: string, locationId: string): Promise<number | null>;
};

export type StockAssignmentRouteDependencies = {
  assignmentQueryRepository: Pick<
    PostgresWorkerAssignmentQueryRepository,
    "getWorkerAssignments" | "getLocationAssignments" | "getLocationStaff"
  >;
  handoverRepository: Pick<
    PostgresOwnershipHandoverRepository,
    "getOriginalWorkerForChain"
  >;
  assignmentCommandService: Pick<
    AssignmentCommandService,
    "assignProduct" | "endHandover" | "initiateHandover" | "reassignProduct"
  >;
  stockBalanceRepository: StockBalanceRepository;
};

export const assignmentRoutes = {
  managerAssign: assignmentRoute(
    "POST",
    "/api/manager/assignments",
    "stock.assignments.manage",
  ),
  managerBatchAssign: assignmentRoute(
    "POST",
    "/api/manager/assignments/batch",
    "stock.assignments.manage",
  ),
  managerInitiateHandover: assignmentRoute(
    "POST",
    "/api/manager/handovers",
    "stock.assignments.manage",
  ),
  managerList: assignmentRoute(
    "GET",
    "/api/manager/assignments",
    "stock.assignments.view",
  ),
  managerReassign: assignmentRoute(
    "POST",
    "/api/manager/assignments/reassign",
    "stock.assignments.manage",
  ),
  managerRevertHandover: assignmentRoute(
    "POST",
    "/api/manager/handovers/revert",
    "stock.assignments.manage",
  ),
  workerInitiateHandover: assignmentRoute(
    "POST",
    "/api/worker/handovers",
    "stock.handovers.manage",
  ),
  workerList: assignmentRoute(
    "GET",
    "/api/worker/assignments",
    "stock.assignments.own.view",
  ),
  workerRevertHandover: assignmentRoute(
    "POST",
    "/api/worker/handovers/revert",
    "stock.handovers.manage",
  ),
} satisfies Record<string, RouteDefinition>;

export async function resolveOriginalWorker(
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

export function toEventResponse(event: {
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

export function createUnavailableDependencies(): StockAssignmentRouteDependencies {
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
      async getLocationAssignments() {
        return unavailable();
      },
      async getLocationStaff() {
        return unavailable();
      },
      async getWorkerAssignments() {
        return unavailable();
      },
    },
    handoverRepository: {
      async getOriginalWorkerForChain() {
        return unavailable();
      },
    },
    assignmentCommandService: {
      async assignProduct() {
        return unavailable();
      },
      async endHandover() {
        return unavailable();
      },
      async initiateHandover() {
        return unavailable();
      },
      async reassignProduct() {
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

function assignmentRoute(
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
