import {
  createDeliveryFromOnlineOrderRequestSchema,
  createDeliveryFromPosSaleRequestSchema,
  createDeliveryFromTransferRequestSchema,
  deliveryResponseSchema,
  type OnlineOrderDeliverySourcePort,
  type PosSaleDeliverySourcePort,
  type TransferDeliverySourcePort,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import type { PermissionResolutionScope } from "../access-control/permission-resolution.service.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { DeliveryCreationService } from "./delivery-creation.contracts.js";
import { DeliverySourceNotFoundError } from "./delivery-errors.js";
import { toDeliveryResponse } from "./delivery-response.mapper.js";
import {
  createFromOnlineOrderRoute,
  createFromPosSaleRoute,
  createFromTransferRoute,
} from "./delivery-route-access.js";

type Deps = {
  deliveryCreationService: DeliveryCreationService;
  permissionService: {
    assertHasPermission(input: {
      locationId?: string;
      permission: string;
      scope?: PermissionResolutionScope;
      user: AuthenticatedActor;
    }): Promise<void>;
  };
  onlineOrderSourcePort: OnlineOrderDeliverySourcePort;
  posSaleSourcePort: PosSaleDeliverySourcePort;
  transferSourcePort: TransferDeliverySourcePort;
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
      const originLocationId = await resolvePosSaleOriginLocationId(
        deps,
        body.invoiceReference,
      );
      await assertOriginPermission({
        actor,
        deps,
        locationId: originLocationId,
        permission: "deliveries.create_from_sale",
      });
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
      const order = await deps.onlineOrderSourcePort.findByOrderReference(
        body.orderReference,
      );
      if (!order) {
        throw new DeliverySourceNotFoundError({
          sourceType: "online_order",
          sourceReference: body.orderReference,
        });
      }
      await assertOriginPermission({
        actor,
        deps,
        locationId: order.locationId,
        permission: "deliveries.create_from_online_order",
      });
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
      const originLocationId = await resolveTransferOriginLocationId(
        deps,
        body.transferReference,
      );
      await assertOriginPermission({
        actor,
        deps,
        locationId: originLocationId,
        permission: "deliveries.create_from_transfer",
      });
      const result = await deps.deliveryCreationService.createFromTransfer({
        transferReference: body.transferReference,
        createdBy: actor.userId,
      });
      return deliveryResponseSchema.parse(toDeliveryResponse(result.delivery));
    },
  });
}

async function resolvePosSaleOriginLocationId(
  deps: Deps,
  invoiceReference: string,
): Promise<string> {
  const sale =
    await deps.posSaleSourcePort.findByInvoiceReference(invoiceReference);

  if (!sale) {
    throw new DeliverySourceNotFoundError({
      sourceType: "pos_sale",
      sourceReference: invoiceReference,
    });
  }

  return sale.locationId;
}

async function resolveTransferOriginLocationId(
  deps: Deps,
  transferReference: string,
): Promise<string> {
  const transfer =
    await deps.transferSourcePort.findByTransferReference(transferReference);

  if (!transfer) {
    throw new DeliverySourceNotFoundError({
      sourceType: "transfer",
      sourceReference: transferReference,
    });
  }

  return transfer.sourceLocationId;
}

async function assertOriginPermission(input: {
  actor: AuthenticatedActor;
  deps: Deps;
  locationId: string;
  permission: string;
}): Promise<void> {
  await input.deps.permissionService.assertHasPermission({
    locationId: input.locationId,
    permission: input.permission,
    scope: "contextual",
    user: input.actor,
  });
}
