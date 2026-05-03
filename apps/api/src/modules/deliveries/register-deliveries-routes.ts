import type {
  OnlineOrderDeliverySourcePort,
  PosSaleDeliverySourcePort,
  TransferDeliverySourcePort,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionScope } from "../access-control/permission-resolution.service.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
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

export function registerDeliveriesRoutes(
  server: FastifyInstance,
  deps: DeliveriesRouteDependencies = createUnavailableDeliveriesDependencies(),
): void {
  registerDeliveryCreationRoutes(server, {
    deliveryCreationService: deps.deliveryCreationService,
    onlineOrderSourcePort: deps.onlineOrderSourcePort,
    permissionService: deps.permissionService,
    posSaleSourcePort: deps.posSaleSourcePort,
    transferSourcePort: deps.transferSourcePort,
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
    permissionService: {
      assertHasPermission: unavailable,
    },
    onlineOrderSourcePort: {
      findByOrderReference: unavailable,
    },
    posSaleSourcePort: {
      findByInvoiceReference: unavailable,
    },
    transferSourcePort: {
      findByTransferReference: unavailable,
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
