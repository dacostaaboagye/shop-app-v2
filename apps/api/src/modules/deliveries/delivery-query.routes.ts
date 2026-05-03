import {
  deliveryResponseSchema,
  deliveryStatusSchema,
  referenceSchema,
  slugSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionScope } from "../access-control/permission-resolution.service.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { DeliveryPublicIdentifierResolver } from "./delivery-public-identifier.repository.js";
import type { DeliveryQueryService } from "./delivery-query.contracts.js";
import { toDeliveryResponse } from "./delivery-response.mapper.js";
import {
  findDeliveryRoute,
  listDeliveriesRoute,
} from "./delivery-route-access.js";

type Deps = {
  deliveryPublicIdentifierResolver: DeliveryPublicIdentifierResolver;
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

const deliveryReferenceParamsSchema = z.object({
  deliveryReference: referenceSchema.regex(/^DLV-[0-9]{5,}$/),
});

const listDeliveriesQuerySchema = z
  .object({
    locationSlug: slugSchema.optional(),
    agentUserSlug: slugSchema.optional(),
    status: z
      .union([deliveryStatusSchema, z.array(deliveryStatusSchema)])
      .optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .refine(
    (value) => Boolean(value.locationSlug) !== Boolean(value.agentUserSlug),
    {
      message: "Provide exactly one of locationSlug or agentUserSlug.",
    },
  );

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
      const params = deliveryReferenceParamsSchema.parse(request.params);
      const record = await deps.deliveryQueryService.findByReference(
        params.deliveryReference,
      );
      if (!record) {
        throw new AppError({
          code: "not_found",
          statusCode: 404,
          title: "Delivery not found",
          detail: `No delivery found for reference ${params.deliveryReference}.`,
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
      if (query.locationSlug) {
        const locationId =
          await deps.deliveryPublicIdentifierResolver.findLocationIdBySlug(
            query.locationSlug,
          );
        if (!locationId) {
          throw new AppError({
            code: "not_found",
            detail: `Location "${query.locationSlug}" was not found.`,
            statusCode: 404,
            title: "Location not found",
          });
        }
        await assertDeliveryViewPermission({
          actor,
          deps,
          locationId,
        });
        const records = await deps.deliveryQueryService.listByLocation({
          locationId,
          ...(Object.keys(filters).length > 0 ? { filters } : {}),
        });
        return listDeliveriesResponseSchema.parse({
          items: records.map(toDeliveryResponse),
        });
      }
      if (query.agentUserSlug !== actor.userSlug) {
        throw new AppError({
          code: "forbidden",
          detail: "Agent delivery lists can only be requested by that agent.",
          statusCode: 403,
          title: "Forbidden",
        });
      }
      const records = await deps.deliveryQueryService.listByAgent({
        agentUserId: actor.userId,
        ...(Object.keys(filters).length > 0 ? { filters } : {}),
      });
      await assertDeliveryViewPermissionsForRecords({
        actor,
        deps,
        locationIds: records.map((record) => record.originLocationId),
      });
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
