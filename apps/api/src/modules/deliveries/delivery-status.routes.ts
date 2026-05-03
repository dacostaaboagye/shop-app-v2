import {
  assignDeliveryRequestSchema,
  cancelDeliveryRequestSchema,
  completeDeliveryRequestSchema,
  deliveryTransitionResponseSchema,
  dispatchDeliveryRequestSchema,
  reassignDeliveryRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { PermissionResolutionScope } from "../access-control/permission-resolution.service.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import { DeliverySourceNotFoundError } from "./delivery-errors.js";
import type { DeliveryQueryService } from "./delivery-query.contracts.js";
import { toTransitionResponse } from "./delivery-response.mapper.js";
import {
  assignDeliveryRoute,
  cancelDeliveryRoute,
  completeDeliveryRoute,
  dispatchDeliveryRoute,
  reassignDeliveryRoute,
} from "./delivery-route-access.js";
import type { DeliveryStatusService } from "./delivery-status.contracts.js";

type Deps = {
  deliveryQueryService: DeliveryQueryService;
  deliveryStatusService: DeliveryStatusService;
  permissionService: {
    assertHasPermission(input: {
      locationId?: string;
      permission: string;
      scope?: PermissionResolutionScope;
      user: AuthenticatedActor;
    }): Promise<void>;
  };
};

const deliveryIdParamsSchema = z.object({
  deliveryId: z.string().uuid(),
});

export function registerDeliveryStatusRoutes(
  server: FastifyInstance,
  deps: Deps,
): void {
  server.route({
    config: { access: assignDeliveryRoute.access },
    method: assignDeliveryRoute.method,
    url: assignDeliveryRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const params = deliveryIdParamsSchema.parse(request.params);
      const body = assignDeliveryRequestSchema.parse(request.body);
      await assertDeliveryOriginPermission({
        actor,
        deliveryId: params.deliveryId,
        deps,
        permission: "deliveries.assign",
      });
      const result = await deps.deliveryStatusService.assign({
        deliveryId: params.deliveryId,
        assignedUserId: body.assignedUserId,
        actorUserId: actor.userId,
        actorUserSlug: actor.userSlug,
      });
      return deliveryTransitionResponseSchema.parse(
        toTransitionResponse(result),
      );
    },
  });

  server.route({
    config: { access: reassignDeliveryRoute.access },
    method: reassignDeliveryRoute.method,
    url: reassignDeliveryRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const params = deliveryIdParamsSchema.parse(request.params);
      const body = reassignDeliveryRequestSchema.parse(request.body);
      await assertDeliveryOriginPermission({
        actor,
        deliveryId: params.deliveryId,
        deps,
        permission: "deliveries.reassign",
      });
      const result = await deps.deliveryStatusService.reassign({
        deliveryId: params.deliveryId,
        assignedUserId: body.assignedUserId,
        actorUserId: actor.userId,
        actorUserSlug: actor.userSlug,
      });
      return deliveryTransitionResponseSchema.parse(
        toTransitionResponse(result),
      );
    },
  });

  server.route({
    config: { access: dispatchDeliveryRoute.access },
    method: dispatchDeliveryRoute.method,
    url: dispatchDeliveryRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const params = deliveryIdParamsSchema.parse(request.params);
      dispatchDeliveryRequestSchema.parse(request.body ?? {});
      await assertDeliveryOriginPermission({
        actor,
        deliveryId: params.deliveryId,
        deps,
        permission: "deliveries.dispatch",
      });
      const result = await deps.deliveryStatusService.dispatch({
        deliveryId: params.deliveryId,
        actorUserId: actor.userId,
        actorUserSlug: actor.userSlug,
      });
      return deliveryTransitionResponseSchema.parse(
        toTransitionResponse(result),
      );
    },
  });

  server.route({
    config: { access: completeDeliveryRoute.access },
    method: completeDeliveryRoute.method,
    url: completeDeliveryRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const params = deliveryIdParamsSchema.parse(request.params);
      completeDeliveryRequestSchema.parse(request.body ?? {});
      await assertDeliveryOriginPermission({
        actor,
        deliveryId: params.deliveryId,
        deps,
        permission: "deliveries.complete",
      });
      const result = await deps.deliveryStatusService.complete({
        deliveryId: params.deliveryId,
        actorUserId: actor.userId,
        actorUserSlug: actor.userSlug,
      });
      return deliveryTransitionResponseSchema.parse(
        toTransitionResponse(result),
      );
    },
  });

  server.route({
    config: { access: cancelDeliveryRoute.access },
    method: cancelDeliveryRoute.method,
    url: cancelDeliveryRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const params = deliveryIdParamsSchema.parse(request.params);
      const body = cancelDeliveryRequestSchema.parse(request.body);
      await assertDeliveryOriginPermission({
        actor,
        deliveryId: params.deliveryId,
        deps,
        permission: "deliveries.cancel",
      });
      const result = await deps.deliveryStatusService.cancel({
        deliveryId: params.deliveryId,
        reason: body.reason,
        actorUserId: actor.userId,
        actorUserSlug: actor.userSlug,
      });
      return deliveryTransitionResponseSchema.parse(
        toTransitionResponse(result),
      );
    },
  });
}

async function assertDeliveryOriginPermission(input: {
  actor: AuthenticatedActor;
  deliveryId: string;
  deps: Deps;
  permission: string;
}): Promise<void> {
  const delivery = await input.deps.deliveryQueryService.findById(
    input.deliveryId,
  );
  if (!delivery) {
    throw new DeliverySourceNotFoundError({
      sourceType: "delivery",
      sourceReference: input.deliveryId,
    });
  }

  await input.deps.permissionService.assertHasPermission({
    locationId: delivery.originLocationId,
    permission: input.permission,
    scope: "contextual",
    user: input.actor,
  });
}
