import {
  assignDeliveryRequestSchema,
  cancelDeliveryRequestSchema,
  completeDeliveryRequestSchema,
  deliveryTransitionResponseSchema,
  dispatchDeliveryRequestSchema,
  reassignDeliveryRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
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
  deliveryStatusService: DeliveryStatusService;
};

type DeliveryIdParams = { deliveryId: string };

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
      const params = request.params as DeliveryIdParams;
      const body = assignDeliveryRequestSchema.parse(request.body);
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
      const params = request.params as DeliveryIdParams;
      const body = reassignDeliveryRequestSchema.parse(request.body);
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
      const params = request.params as DeliveryIdParams;
      dispatchDeliveryRequestSchema.parse(request.body ?? {});
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
      const params = request.params as DeliveryIdParams;
      completeDeliveryRequestSchema.parse(request.body ?? {});
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
      const params = request.params as DeliveryIdParams;
      const body = cancelDeliveryRequestSchema.parse(request.body);
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
