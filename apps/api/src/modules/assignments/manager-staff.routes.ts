import {
  locationStaffListQuerySchema,
  locationStaffListResponseSchema,
  managerCreateWorkerRequestSchema,
  managerCreateWorkerResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { AdminStaffProvisioningService } from "../admin/admin-staff-provisioning.service.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { PostgresWorkerAssignmentQueryRepository } from "./postgres-worker-assignment-query.repository.js";

export type ManagerStaffRouteDependencies = {
  assignmentQueryRepository: Pick<
    PostgresWorkerAssignmentQueryRepository,
    "getLocationStaff"
  >;
  staffProvisioningService?: Pick<AdminStaffProvisioningService, "createUser">;
};

const managerStaffRoute: RouteDefinition = {
  access: { kind: "permission", permission: "staff.view", scope: "contextual" },
  method: "GET",
  url: "/api/manager/staff",
};

const managerCreateWorkerRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "access.assignments.manage",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/manager/staff",
};

const managerCreateBuckets = new Map<
  string,
  { count: number; resetAt: number }
>();
const MANAGER_CREATE_LIMIT = 20;
const MANAGER_CREATE_WINDOW_MS = 15 * 60_000;

export function registerManagerStaffRoutes(
  server: FastifyInstance,
  dependencies: ManagerStaffRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: managerStaffRoute.access },
    method: managerStaffRoute.method,
    url: managerStaffRoute.url,
    async handler(request) {
      const query = locationStaffListQuerySchema.parse(request.query);
      // The contextual route guard already enforces that the actor holds
      // staff.view on this specific locationId via the access-control
      // middleware (resolvePermissions filters by the supplied locationId).
      const staff =
        await dependencies.assignmentQueryRepository.getLocationStaff(
          query.locationId,
        );

      return locationStaffListResponseSchema.parse({
        items: staff.map((member) => ({
          activeAssignmentCount: member.activeAssignmentCount,
          assignedAt: toIsoTimestamp(member.assignedAt),
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          lastSaleAt: toIsoTimestamp(member.lastSaleAt),
          netSalesAmount: member.netSalesAmount,
          primaryImageUrl: member.primaryImageUrl,
          roleName: member.roleName,
          roleSlug: member.roleSlug,
          returnsCount: member.returnsCount,
          returnsTotalAmount: member.returnsTotalAmount,
          salesCount: member.salesCount,
          salesTotalAmount: member.salesTotalAmount,
          status: member.status,
          userId: member.userId,
          userSlug: member.userSlug,
        })),
        locationId: query.locationId,
        locationName: staff[0]?.locationName ?? "",
      });
    },
  });

  server.route({
    config: {
      access: managerCreateWorkerRoute.access,
      rateLimit: { max: 20, timeWindow: "15 minutes" },
    },
    method: managerCreateWorkerRoute.method,
    url: managerCreateWorkerRoute.url,
    async handler(request, reply) {
      const actor = getAuthenticatedActor(request);
      assertManagerCreateRateLimit(actor.userId);
      const input = managerCreateWorkerRequestSchema.parse(request.body);

      try {
        const created = await dependencies.staffProvisioningService?.createUser(
          actor,
          {
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            reason: input.reason,
            roleAssignments: input.locationSlugs.map((locationSlug) => ({
              locationSlug,
              roleSlug: "worker",
            })),
          },
          new Date(),
          {
            actorRole: "manager",
            allowedRoleSlugs: ["worker"],
            locationPolicy: {
              permission: "access.assignments.manage",
              requireLocationAssignments: true,
            },
          },
        );

        if (!created) {
          throw unavailableManagerStaffError();
        }

        return reply.status(201).send(
          managerCreateWorkerResponseSchema.parse({
            email: created.email,
            firstName: created.firstName,
            lastName: created.lastName,
            locationSlugs: input.locationSlugs,
            requiresPasswordChange: created.requiresPasswordChange,
            setupInstruction: created.setupInstruction,
            slug: created.slug,
            status: created.status,
          }),
        );
      } catch (error) {
        if (shouldMaskManagerProvisioningError(error)) {
          request.log.warn(
            {
              actorSlug: actor.userSlug,
              cause: error.code,
              requestId: request.id,
            },
            "Manager worker provisioning failed",
          );
          throw genericManagerProvisioningError(request.id);
        }

        throw error;
      }
    },
  });
}

function createUnavailableDependencies(): ManagerStaffRouteDependencies {
  return {
    assignmentQueryRepository: {
      async getLocationStaff() {
        throw new AppError({
          code: "internal_error",
          detail:
            "Manager staff services are not configured for this environment.",
          statusCode: 503,
          title: "Manager staff unavailable",
        });
      },
    },
    staffProvisioningService: {
      async createUser() {
        throw unavailableManagerStaffError();
      },
    },
  };
}

function assertManagerCreateRateLimit(actorId: string) {
  const now = Date.now();
  const bucket = managerCreateBuckets.get(actorId);

  if (!bucket || bucket.resetAt <= now) {
    managerCreateBuckets.set(actorId, {
      count: 1,
      resetAt: now + MANAGER_CREATE_WINDOW_MS,
    });
    return;
  }

  bucket.count += 1;

  if (bucket.count <= MANAGER_CREATE_LIMIT) {
    return;
  }

  throw new AppError({
    code: "rate_limited",
    detail: "You have added many workers in a short time. Try again later.",
    statusCode: 429,
    title: "Too Many Requests",
  });
}

function shouldMaskManagerProvisioningError(error: unknown): error is AppError {
  return (
    error instanceof AppError &&
    ["conflict", "forbidden", "not_found"].includes(error.code)
  );
}

function genericManagerProvisioningError(requestId: string) {
  return new AppError({
    code: "provisioning_failed",
    detail: `We couldn't create this worker. Reference: ${requestId}. Contact support if this keeps happening.`,
    statusCode: 409,
    title: "Worker provisioning failed",
  });
}

function unavailableManagerStaffError() {
  return new AppError({
    code: "internal_error",
    detail: "Manager staff services are not configured for this environment.",
    statusCode: 503,
    title: "Manager staff unavailable",
  });
}

function toIsoTimestamp(value: Date | string): string;
function toIsoTimestamp(value: Date | string | null): string | null;
function toIsoTimestamp(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
