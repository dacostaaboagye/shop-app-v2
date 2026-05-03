import { deliveryResponseSchema, deliveryStatusSchema } from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionScope } from "../access-control/permission-resolution.service.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { DeliveryQueryService } from "./delivery-query.contracts.js";
import { toDeliveryResponse } from "./delivery-response.mapper.js";
import {
  findDeliveryRoute,
  listDeliveriesRoute,
} from "./delivery-route-access.js";

type Deps = {
  deliveryQueryService: DeliveryQueryService;
  permissionService: {
    assertHasPermission(input: {
      locationId?: string;
      permission: string;
      scope?: PermissionResolutionScope;
      user: AuthenticatedActor;
    }): Promise<void>;
  };
};

type DeliveryIdParams = { deliveryId: string };

const listDeliveriesQuerySchema = z
  .object({
    locationId: z.string().uuid().optional(),
    agentUserId: z.string().uuid().optional(),
    status: z
      .union([deliveryStatusSchema, z.array(deliveryStatusSchema)])
      .optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .refine((value) => Boolean(value.locationId) !== Boolean(value.agentUserId), {
    message: "Provide exactly one of locationId or agentUserId.",
  });

const listDeliveriesResponseSchema = z.object({
  items: z.array(deliveryResponseSchema),
});

export function registerDeliveryQueryRoutes(
  server: FastifyInstance,
  deps: Deps,
): void {
  server.route({
    config: { access: findDeliveryRoute.access },
    method: findDeliveryRoute.method,
    url: findDeliveryRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const params = request.params as DeliveryIdParams;
      const record = await deps.deliveryQueryService.findById(
        params.deliveryId,
      );
      if (!record) {
        throw new AppError({
          code: "not_found",
          statusCode: 404,
          title: "Delivery not found",
          detail: `No delivery found for id ${params.deliveryId}.`,
        });
      }
      await assertDeliveryViewPermission({
        actor,
        deps,
        locationId: record.originLocationId,
      });
      return deliveryResponseSchema.parse(toDeliveryResponse(record));
    },
  });

  server.route({
    config: { access: listDeliveriesRoute.access },
    method: listDeliveriesRoute.method,
    url: listDeliveriesRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = listDeliveriesQuerySchema.parse(request.query);
      type StatusList = z.infer<typeof deliveryStatusSchema>[];
      const filters: { status?: StatusList; limit?: number } = {};
      if (query.status) {
        filters.status = Array.isArray(query.status)
          ? query.status
          : [query.status];
      }
      if (query.limit !== undefined) {
        filters.limit = query.limit;
      }
      if (query.locationId) {
        await assertDeliveryViewPermission({
          actor,
          deps,
          locationId: query.locationId,
        });
      }
      if (query.agentUserId && query.agentUserId !== actor.userId) {
        throw new AppError({
          code: "forbidden",
          detail: "Agent delivery lists can only be requested by that agent.",
          statusCode: 403,
          title: "Forbidden",
        });
      }
      const records = await (query.agentUserId
        ? deps.deliveryQueryService.listByAgent({
            agentUserId: query.agentUserId,
            ...(Object.keys(filters).length > 0 ? { filters } : {}),
          })
        : deps.deliveryQueryService.listByLocation({
            // biome-ignore lint/style/noNonNullAssertion: refine guarantees one of the two is set
            locationId: query.locationId!,
            ...(Object.keys(filters).length > 0 ? { filters } : {}),
          }));
      if (query.agentUserId) {
        await assertDeliveryViewPermissionsForRecords({
          actor,
          deps,
          locationIds: records.map((record) => record.originLocationId),
        });
      }
      return listDeliveriesResponseSchema.parse({
        items: records.map(toDeliveryResponse),
      });
    },
  });
}

async function assertDeliveryViewPermission(input: {
  actor: AuthenticatedActor;
  deps: Deps;
  locationId: string;
}): Promise<void> {
  await input.deps.permissionService.assertHasPermission({
    locationId: input.locationId,
    permission: "deliveries.view",
    scope: "contextual",
    user: input.actor,
  });
}

async function assertDeliveryViewPermissionsForRecords(input: {
  actor: AuthenticatedActor;
  deps: Deps;
  locationIds: string[];
}): Promise<void> {
  const uniqueLocationIds = Array.from(new Set(input.locationIds));
  for (const locationId of uniqueLocationIds) {
    await assertDeliveryViewPermission({
      actor: input.actor,
      deps: input.deps,
      locationId,
    });
  }
}
