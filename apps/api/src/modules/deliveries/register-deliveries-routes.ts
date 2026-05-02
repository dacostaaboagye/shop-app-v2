import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { DeliveryCreationService } from "./delivery-creation.contracts.js";
import { registerDeliveryCreationRoutes } from "./delivery-creation.routes.js";
import type { DeliveryQueryService } from "./delivery-query.contracts.js";
import { registerDeliveryQueryRoutes } from "./delivery-query.routes.js";
import type { DeliveryStatusService } from "./delivery-status.contracts.js";
import { registerDeliveryStatusRoutes } from "./delivery-status.routes.js";

type DeliveriesRouteDependencies = {
  deliveryCreationService: DeliveryCreationService;
  deliveryStatusService: DeliveryStatusService;
  deliveryQueryService: DeliveryQueryService;
};

export function registerDeliveriesRoutes(
  server: FastifyInstance,
  deps: DeliveriesRouteDependencies = createUnavailableDeliveriesDependencies(),
): void {
  registerDeliveryCreationRoutes(server, {
    deliveryCreationService: deps.deliveryCreationService,
  });
  registerDeliveryStatusRoutes(server, {
    deliveryStatusService: deps.deliveryStatusService,
  });
  registerDeliveryQueryRoutes(server, {
    deliveryQueryService: deps.deliveryQueryService,
  });
}

function createUnavailableDeliveriesDependencies(): DeliveriesRouteDependencies {
  const unavailable = (): never => {
    throw new AppError({
      code: "internal_error",
      detail: "Delivery services are not configured for this environment.",
      statusCode: 503,
      title: "Deliveries unavailable",
    });
  };
  return {
    deliveryCreationService: {
      createFromPosSale: unavailable,
      createFromOnlineOrder: unavailable,
      createFromTransfer: unavailable,
    },
    deliveryStatusService: {
      assign: unavailable,
      reassign: unavailable,
      dispatch: unavailable,
      complete: unavailable,
      cancel: unavailable,
    },
    deliveryQueryService: {
      findById: unavailable,
      listByAgent: unavailable,
      listByLocation: unavailable,
    },
  };
}
