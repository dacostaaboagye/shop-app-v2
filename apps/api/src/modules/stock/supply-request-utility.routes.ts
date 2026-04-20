import {
  gtnResponseSchema,
  supplyRequestSourceListQuerySchema,
  supplyRequestSourceListResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { SupplyRequestAccessPolicy } from "./supply-request-access-policy.js";
import {
  getAuthenticatedActor,
  type StockSupplyRouteDependencies,
  supplyRequestRoutes,
  toGtnResponse,
} from "./supply-request-route-support.js";

export function registerSupplyRequestUtilityRoutes(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  registerGetGtnRoute(server, dependencies, accessPolicy);
  registerSourceLocationsRoute(server, dependencies, accessPolicy);
}

function registerGetGtnRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  const route = supplyRequestRoutes.getGtn;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const { id } = request.params as { id: string };
      const gtn = await dependencies.supplyRequestRepository.findGtnById(id);
      if (!gtn) {
        throw new AppError({
          code: "not_found",
          detail: `Goods Transfer Note ${id} not found.`,
          statusCode: 404,
          title: "GTN not found",
        });
      }
      const relatedRequest =
        await dependencies.supplyRequestRepository.findById(
          gtn.supplyRequestId,
        );
      if (!relatedRequest) {
        throw new AppError({
          code: "not_found",
          detail: `Supply request ${gtn.supplyRequestId} not found for this GTN.`,
          statusCode: 404,
          title: "Supply request not found",
        });
      }
      await accessPolicy.assertCanViewGtn({
        actor,
        gtn,
        supplyRequest: relatedRequest,
      });
      return gtnResponseSchema.parse(toGtnResponse(gtn));
    },
  });
}

function registerSourceLocationsRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  const route = supplyRequestRoutes.workerSourceLocations;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = supplyRequestSourceListQuerySchema.parse(request.query);
      await accessPolicy.assertCanCreateRequest({
        actor,
        destinationLocationId: query.destinationLocationId,
      });
      const items = await dependencies.locationRepository.listActiveLocations();
      return supplyRequestSourceListResponseSchema.parse({
        items: items
          .filter((location) => location.id !== query.destinationLocationId)
          .map((location) => ({
            locationId: location.id,
            locationName: location.name,
          })),
      });
    },
  });
}
