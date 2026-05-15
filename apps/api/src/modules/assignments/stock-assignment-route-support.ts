import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type { PostgresOwnershipHandoverRepository } from "../inventory-ownership/postgres-ownership-handover.repository.js";
import type { AssignmentCommandService } from "./assignment-command.service.js";
import type { PostgresAssignmentHistoryQueryRepository } from "./postgres-assignment-history-query.repository.js";
import type { PostgresManagerHandoverQueryRepository } from "./postgres-manager-handover-query.repository.js";
import type { PostgresWorkerAssignmentQueryRepository } from "./postgres-worker-assignment-query.repository.js";
import type { PostgresWorkerHandoverQueryRepository } from "./postgres-worker-handover-query.repository.js";

export { assignmentRoutes } from "./stock-assignment-route-definitions.js";

type StockBalanceRepository = {
  getOnHandQuantity(skuId: string, locationId: string): Promise<number | null>;
};

export type StockAssignmentRouteDependencies = {
  assignmentQueryRepository: Pick<
    PostgresWorkerAssignmentQueryRepository,
    "getWorkerAssignments" | "getLocationAssignments" | "getLocationStaff"
  >;
  assignmentHistoryQueryRepository: Pick<
    PostgresAssignmentHistoryQueryRepository,
    "getAssignmentHistory" | "getWorkerAssignmentHistory"
  >;
  handoverRepository: Pick<
    PostgresOwnershipHandoverRepository,
    "getOriginalWorkerForChain"
  >;
  handoverQueryRepository: Pick<
    PostgresWorkerHandoverQueryRepository,
    "getWorkerHandoverChain" | "listWorkerHandovers"
  >;
  managerHandoverQueryRepository: Pick<
    PostgresManagerHandoverQueryRepository,
    "getManagerHandoverChain" | "listLocationHandovers"
  >;
  assignmentCommandService: Pick<
    AssignmentCommandService,
    "assignProduct" | "endHandover" | "initiateHandover" | "reassignProduct"
  >;
  permissionService: Pick<PermissionResolutionService, "assertHasPermission">;
  stockBalanceRepository: StockBalanceRepository;
};

/**
 * Confirms the actor holds `permission` on the specific `locationId` they
 * just supplied in the request. The any_active route guard only checks
 * whether the permission exists in some scope; without this follow-up
 * check, a manager of location A could act on location B by passing B's
 * id in the body.
 */
export async function assertActorCanAccessLocation(
  permissionService: Pick<PermissionResolutionService, "assertHasPermission">,
  input: {
    actor: AuthenticatedActor;
    locationId: string;
    permission: string;
  },
): Promise<void> {
  await permissionService.assertHasPermission({
    locationId: input.locationId,
    permission: input.permission,
    user: input.actor,
  });
}

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
    assignmentHistoryQueryRepository: {
      async getAssignmentHistory() {
        return unavailable();
      },
      async getWorkerAssignmentHistory() {
        return unavailable();
      },
    },
    handoverRepository: {
      async getOriginalWorkerForChain() {
        return unavailable();
      },
    },
    handoverQueryRepository: {
      async getWorkerHandoverChain() {
        return unavailable();
      },
      async listWorkerHandovers() {
        return unavailable();
      },
    },
    managerHandoverQueryRepository: {
      async getManagerHandoverChain() {
        return unavailable();
      },
      async listLocationHandovers() {
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
    permissionService: {
      async assertHasPermission() {
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
