import {
  assignmentHistoryQuerySchema,
  assignmentHistoryResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { AssignmentHistoryRow } from "./postgres-assignment-history-query.repository.js";
import {
  assertActorCanAccessLocation,
  assignmentRoutes,
  type StockAssignmentRouteDependencies,
} from "./stock-assignment-route-support.js";

export function registerAssignmentHistoryRoutes(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  registerManagerHistoryRoute(server, dependencies);
  registerWorkerHistoryRoute(server, dependencies);
}

function registerManagerHistoryRoute(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  const route = assignmentRoutes.managerHistory;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = assignmentHistoryQuerySchema.parse(request.query);
      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: query.locationId,
        permission: "stock.assignments.view",
      });
      const history =
        await dependencies.assignmentHistoryQueryRepository.getAssignmentHistory(
          query,
        );
      return toAssignmentHistoryResponse(history);
    },
  });
}

function registerWorkerHistoryRoute(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  const route = assignmentRoutes.workerHistory;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = assignmentHistoryQuerySchema.parse(request.query);
      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: query.locationId,
        permission: "stock.assignments.own.view",
      });
      const history =
        await dependencies.assignmentHistoryQueryRepository.getWorkerAssignmentHistory(
          {
            ...query,
            workerId: actor.userId,
          },
        );
      return toAssignmentHistoryResponse(history);
    },
  });
}

function toAssignmentHistoryResponse(history: AssignmentHistoryRow | null) {
  if (!history) {
    throw new AppError({
      code: "not_found",
      detail: "No assignment history is available for this stock item.",
      statusCode: 404,
      title: "Assignment history not found",
    });
  }

  return assignmentHistoryResponseSchema.parse({
    ...history,
    items: history.items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      effectiveFrom: item.effectiveFrom.toISOString(),
    })),
  });
}
