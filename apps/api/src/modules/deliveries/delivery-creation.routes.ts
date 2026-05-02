import {
  createDeliveryFromOnlineOrderRequestSchema,
  createDeliveryFromPosSaleRequestSchema,
  createDeliveryFromTransferRequestSchema,
  deliveryResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { DeliveryCreationService } from "./delivery-creation.contracts.js";
import { toDeliveryResponse } from "./delivery-response.mapper.js";
import {
  createFromOnlineOrderRoute,
  createFromPosSaleRoute,
  createFromTransferRoute,
} from "./delivery-route-access.js";

type Deps = {
  deliveryCreationService: DeliveryCreationService;
};

export function registerDeliveryCreationRoutes(
  server: FastifyInstance,
  deps: Deps,
): void {
  server.route({
    config: { access: createFromPosSaleRoute.access },
    method: createFromPosSaleRoute.method,
    url: createFromPosSaleRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = createDeliveryFromPosSaleRequestSchema.parse(request.body);
      const result = await deps.deliveryCreationService.createFromPosSale({
        invoiceReference: body.invoiceReference,
        destination: body.destination,
        createdBy: actor.userId,
      });
      return deliveryResponseSchema.parse(toDeliveryResponse(result.delivery));
    },
  });

  server.route({
    config: { access: createFromOnlineOrderRoute.access },
    method: createFromOnlineOrderRoute.method,
    url: createFromOnlineOrderRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = createDeliveryFromOnlineOrderRequestSchema.parse(
        request.body,
      );
      const result = await deps.deliveryCreationService.createFromOnlineOrder({
        orderReference: body.orderReference,
        destination: body.destination,
        createdBy: actor.userId,
      });
      return deliveryResponseSchema.parse(toDeliveryResponse(result.delivery));
    },
  });

  server.route({
    config: { access: createFromTransferRoute.access },
    method: createFromTransferRoute.method,
    url: createFromTransferRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = createDeliveryFromTransferRequestSchema.parse(request.body);
      const result = await deps.deliveryCreationService.createFromTransfer({
        transferReference: body.transferReference,
        createdBy: actor.userId,
      });
      return deliveryResponseSchema.parse(toDeliveryResponse(result.delivery));
    },
  });
}
