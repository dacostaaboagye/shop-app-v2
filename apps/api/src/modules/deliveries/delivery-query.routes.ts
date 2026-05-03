import { deliveryResponseSchema, deliveryStatusSchema } from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../_core/errors/app-error.js";
import type { DeliveryQueryService } from "./delivery-query.contracts.js";
import { toDeliveryResponse } from "./delivery-response.mapper.js";
import {
  findDeliveryRoute,
  listDeliveriesRoute,
} from "./delivery-route-access.js";

type Deps = {
  deliveryQueryService: DeliveryQueryService;
};

type DeliveryIdParams = { deliveryId: string };

const listDeliveriesQuerySchema = z
  .object({
    locationId: z.string().uuid().optional(),
    agentUserId: z.string().uuid().optional(),
    status: z
      .union([deliveryStatusSchema, z.array(deliveryStatusSchema)])
      .optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .refine((value) => Boolean(value.locationId) !== Boolean(value.agentUserId), {
    message: "Provide exactly one of locationId or agentUserId.",
  });

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
      const params = request.params as DeliveryIdParams;
      const record = await deps.deliveryQueryService.findById(
        params.deliveryId,
      );
      if (!record) {
        throw new AppError({
          code: "not_found",
          statusCode: 404,
          title: "Delivery not found",
          detail: `No delivery found for id ${params.deliveryId}.`,
        });
      }
      return deliveryResponseSchema.parse(toDeliveryResponse(record));
    },
  });

  server.route({
    config: { access: listDeliveriesRoute.access },
    method: listDeliveriesRoute.method,
    url: listDeliveriesRoute.url,
    async handler(request) {
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
      const records = await (query.agentUserId
        ? deps.deliveryQueryService.listByAgent({
            agentUserId: query.agentUserId,
            ...(Object.keys(filters).length > 0 ? { filters } : {}),
          })
        : deps.deliveryQueryService.listByLocation({
            // biome-ignore lint/style/noNonNullAssertion: refine guarantees one of the two is set
            locationId: query.locationId!,
            ...(Object.keys(filters).length > 0 ? { filters } : {}),
          }));
      return listDeliveriesResponseSchema.parse({
        items: records.map(toDeliveryResponse),
      });
    },
  });
}
