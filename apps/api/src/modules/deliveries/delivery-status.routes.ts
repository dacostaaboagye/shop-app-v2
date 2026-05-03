import {
  assignDeliveryRequestSchema,
  cancelDeliveryRequestSchema,
  completeDeliveryRequestSchema,
  deliveryTransitionResponseSchema,
  dispatchDeliveryRequestSchema,
  reassignDeliveryRequestSchema,
  referenceSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { PermissionResolutionScope } from "../access-control/permission-resolution.service.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { DeliveryRecord } from "./delivery.types.js";
import { DeliverySourceNotFoundError } from "./delivery-errors.js";
import type { DeliveryPublicIdentifierResolver } from "./delivery-public-identifier.repository.js";
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
import { runStatusTransitionSafely } from "./delivery-status-public-error.mapper.js";

type Deps = {
  deliveryPublicIdentifierResolver: DeliveryPublicIdentifierResolver;
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

const deliveryReferenceParamsSchema = z.object({
  deliveryReference: referenceSchema.regex(/^DLV-[0-9]{5,}$/),
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
      const params = deliveryReferenceParamsSchema.parse(request.params);
      const body = assignDeliveryRequestSchema.parse(request.body);
      const delivery = await assertDeliveryOriginPermission({
        actor,
        deliveryReference: params.deliveryReference,
        deps,
        permission: "deliveries.assign",
      });
      const assignedUserId = await resolveAssignedUserId(deps, body);
      const result = await runStatusTransitionSafely(
        () =>
          deps.deliveryStatusService.assign({
            deliveryId: delivery.deliveryId,
            assignedUserId,
            actorUserId: actor.userId,
            actorUserSlug: actor.userSlug,
          }),
        {
          assignedUserSlug: body.assignedUserSlug,
          deliveryReference: delivery.deliveryReference,
        },
      );
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
      const params = deliveryReferenceParamsSchema.parse(request.params);
      const body = reassignDeliveryRequestSchema.parse(request.body);
      const delivery = await assertDeliveryOriginPermission({
        actor,
        deliveryReference: params.deliveryReference,
        deps,
        permission: "deliveries.reassign",
      });
      const assignedUserId = await resolveAssignedUserId(deps, body);
      const result = await runStatusTransitionSafely(
        () =>
          deps.deliveryStatusService.reassign({
            deliveryId: delivery.deliveryId,
            assignedUserId,
            actorUserId: actor.userId,
            actorUserSlug: actor.userSlug,
          }),
        {
          assignedUserSlug: body.assignedUserSlug,
          deliveryReference: delivery.deliveryReference,
        },
      );
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
      const params = deliveryReferenceParamsSchema.parse(request.params);
      dispatchDeliveryRequestSchema.parse(request.body ?? {});
      const delivery = await assertDeliveryOriginPermission({
        actor,
        deliveryReference: params.deliveryReference,
        deps,
        permission: "deliveries.dispatch",
      });
      const result = await runStatusTransitionSafely(
        () =>
          deps.deliveryStatusService.dispatch({
            deliveryId: delivery.deliveryId,
            actorUserId: actor.userId,
            actorUserSlug: actor.userSlug,
          }),
        { deliveryReference: delivery.deliveryReference },
      );
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
      const params = deliveryReferenceParamsSchema.parse(request.params);
      completeDeliveryRequestSchema.parse(request.body ?? {});
      const delivery = await assertDeliveryOriginPermission({
        actor,
        deliveryReference: params.deliveryReference,
        deps,
        permission: "deliveries.complete",
      });
      const result = await runStatusTransitionSafely(
        () =>
          deps.deliveryStatusService.complete({
            deliveryId: delivery.deliveryId,
            actorUserId: actor.userId,
            actorUserSlug: actor.userSlug,
          }),
        { deliveryReference: delivery.deliveryReference },
      );
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
      const params = deliveryReferenceParamsSchema.parse(request.params);
      const body = cancelDeliveryRequestSchema.parse(request.body);
      const delivery = await assertDeliveryOriginPermission({
        actor,
        deliveryReference: params.deliveryReference,
        deps,
        permission: "deliveries.cancel",
      });
      const result = await runStatusTransitionSafely(
        () =>
          deps.deliveryStatusService.cancel({
            deliveryId: delivery.deliveryId,
            reason: body.reason,
            actorUserId: actor.userId,
            actorUserSlug: actor.userSlug,
          }),
        { deliveryReference: delivery.deliveryReference },
      );
      return deliveryTransitionResponseSchema.parse(
        toTransitionResponse(result),
      );
    },
  });
}

async function assertDeliveryOriginPermission(input: {
  actor: AuthenticatedActor;
  deliveryReference: string;
  deps: Deps;
  permission: string;
}): Promise<DeliveryRecord> {
  const delivery = await input.deps.deliveryQueryService.findByReference(
    input.deliveryReference,
  );
  if (!delivery) {
    throw new DeliverySourceNotFoundError({
      sourceType: "delivery",
      sourceReference: input.deliveryReference,
    });
  }

  await input.deps.permissionService.assertHasPermission({
    locationId: delivery.originLocationId,
    permission: input.permission,
    scope: "contextual",
    user: input.actor,
  });
  return delivery;
}

async function resolveAssignedUserId(
  deps: Deps,
  input: { assignedUserSlug: string },
): Promise<string> {
  const assignedUserId =
    await deps.deliveryPublicIdentifierResolver.findUserIdBySlug(
      input.assignedUserSlug,
    );
  if (!assignedUserId) {
    throw new DeliverySourceNotFoundError({
      sourceType: "user",
      sourceReference: input.assignedUserSlug,
    });
  }
  return assignedUserId;
}
