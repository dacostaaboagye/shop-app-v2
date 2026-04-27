import {
  bulkStockSupplyRequestResponseSchema,
  createBulkStockSupplyRequestSchema,
  createStockSupplyRequestSchema,
  stockSupplyRequestResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { SupplyRequestAccessPolicy } from "./supply-request-access-policy.js";
import {
  assertValidRequestLocations,
  loadVariantSnapshots,
} from "./supply-request-create-route-support.js";
import {
  getAuthenticatedActor,
  type StockSupplyRouteDependencies,
  supplyRequestRoutes,
  toRequestResponse,
} from "./supply-request-route-support.js";

export function registerManagerSupplyRequestCreateRoutes(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  registerCreateRoute(server, dependencies, accessPolicy);
  registerCreateBatchRoute(server, dependencies, accessPolicy);
}

function registerCreateRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  const route = supplyRequestRoutes.managerCreate;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const body = createStockSupplyRequestSchema.parse(request.body);
      await assertValidRequestLocations(body.sourceLocationId, body.locationId);
      await accessPolicy.assertCanCreateManagedRequest({
        actor,
        destinationLocationId: body.locationId,
      });
      const snapshot =
        await dependencies.variantSnapshotRepository.getVariantSnapshot(
          body.skuId,
        );
      if (!snapshot) {
        throw new AppError({
          code: "not_found",
          detail: `SKU ${body.skuId} does not exist or is not active.`,
          statusCode: 404,
          title: "SKU not found",
        });
      }

      const reference =
        await dependencies.referenceNumberService.generateReference({
          sequenceKey: "supply-request",
        });
      const row = await dependencies.supplyService.createRequest({
        actor,
        locationId: body.locationId,
        notes: body.notes ?? null,
        reference,
        requestedQuantity: body.requestedQuantity,
        requesterId: userId,
        skuId: body.skuId,
        skuSnapshot: snapshot,
        sourceLocationId: body.sourceLocationId,
      });

      return stockSupplyRequestResponseSchema.parse(toRequestResponse(row));
    },
  });
}

function registerCreateBatchRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  const route = supplyRequestRoutes.managerCreateBatch;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const body = createBulkStockSupplyRequestSchema.parse(request.body);
      await assertValidRequestLocations(body.sourceLocationId, body.locationId);
      await accessPolicy.assertCanCreateManagedRequest({
        actor,
        destinationLocationId: body.locationId,
      });

      const snapshots = await loadVariantSnapshots(
        body.items.map((item) => item.skuId),
        dependencies,
      );
      const requestGroupReference =
        await dependencies.referenceNumberService.generateReference({
          sequenceKey: "supply-request-group",
        });
      const items = await Promise.all(
        body.items.map(async (item) => ({
          reference:
            await dependencies.referenceNumberService.generateReference({
              sequenceKey: "supply-request",
            }),
          requestedQuantity: item.requestedQuantity,
          skuId: item.skuId,
          skuSnapshot: snapshots.get(item.skuId) as {
            productName: string;
            sku: string;
            variantName: string;
          },
        })),
      );

      const rows = await dependencies.supplyService.createRequestBatch({
        actor,
        items,
        locationId: body.locationId,
        notes: body.notes ?? null,
        requestGroupReference,
        requesterId: userId,
        sourceLocationId: body.sourceLocationId,
      });

      return bulkStockSupplyRequestResponseSchema.parse({
        items: rows.map(toRequestResponse),
        requestGroupReference,
      });
    },
  });
}
