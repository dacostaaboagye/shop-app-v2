import { platformEventDeliveryHealthResponseSchema } from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PlatformEventDeliveryHealthService } from "./platform-event-delivery-health.service.js";

type PlatformEventAdminRouteDependencies = {
  deliveryHealthService: Pick<PlatformEventDeliveryHealthService, "getHealth">;
};

const platformEventDeliveryHealthRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "admin.dashboard.view",
    scope: "any_active",
  },
  method: "GET",
  url: "/api/admin/platform-events/delivery-health",
};

export function registerPlatformEventAdminRoutes(
  server: FastifyInstance,
  dependencies: PlatformEventAdminRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: platformEventDeliveryHealthRoute.access },
    method: platformEventDeliveryHealthRoute.method,
    url: platformEventDeliveryHealthRoute.url,
    async handler() {
      const result = await dependencies.deliveryHealthService.getHealth({
        now: new Date(),
      });

      return platformEventDeliveryHealthResponseSchema.parse(result);
    },
  });
}

function createUnavailableDependencies(): PlatformEventAdminRouteDependencies {
  return {
    deliveryHealthService: {
      async getHealth() {
        throw new AppError({
          code: "internal_error",
          detail: "Platform event admin services are not configured.",
          statusCode: 503,
          title: "Platform event admin unavailable",
        });
      },
    },
  };
}
