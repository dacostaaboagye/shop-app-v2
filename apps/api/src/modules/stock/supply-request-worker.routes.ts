import {
  bulkStockSupplyRequestResponseSchema,
  cancelStockSupplyRequestSchema,
  confirmReceiptSchema,
  createBulkStockSupplyRequestSchema,
  createStockSupplyRequestSchema,
  stockSupplyRequestListQuerySchema,
  stockSupplyRequestListResponseSchema,
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
import { cannotCancelError } from "./supply-request-worker-route-support.js";

export function registerWorkerSupplyRequestRoutes(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  registerCreateRoute(server, dependencies, accessPolicy);
  registerCreateBatchRoute(server, dependencies, accessPolicy);
  registerListRoute(server, dependencies);
  registerCancelRoute(server, dependencies, accessPolicy);
  registerConfirmReceiptRoute(server, dependencies, accessPolicy);
}

function registerCreateRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  const route = supplyRequestRoutes.workerCreate;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const body = createStockSupplyRequestSchema.parse(request.body);
      if (body.sourceLocationId === body.locationId) {
        throw new AppError({
          code: "validation_error",
          detail: "Source and destination locations must be different.",
          statusCode: 400,
          title: "Invalid locations",
        });
      }

      await accessPolicy.assertCanCreateRequest({
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
  const route = supplyRequestRoutes.workerCreateBatch;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const body = createBulkStockSupplyRequestSchema.parse(request.body);

      await assertValidRequestLocations(body.sourceLocationId, body.locationId);
      await accessPolicy.assertCanCreateRequest({
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

function registerListRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
) {
  const route = supplyRequestRoutes.workerList;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const query = stockSupplyRequestListQuerySchema.parse(request.query);
      const result = await dependencies.supplyRequestRepository.listByRequester(
        {
          page: query.page,
          pageSize: query.pageSize,
          requesterId: userId,
          ...(query.status ? { status: query.status } : {}),
        },
      );
      return stockSupplyRequestListResponseSchema.parse({
        items: result.items.map(toRequestResponse),
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
      });
    },
  });
}

function registerCancelRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  const route = supplyRequestRoutes.workerCancel;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const { id } = request.params as { id: string };
      const body = cancelStockSupplyRequestSchema.parse(request.body ?? {});
      const existingRequest =
        await dependencies.supplyRequestRepository.findById(id);
      if (!existingRequest) {
        throw cannotCancelError();
      }

      await accessPolicy.assertCanCancelRequest({
        actor,
        supplyRequest: existingRequest,
        ...(body.adminOverrideReason
          ? { adminOverrideReason: body.adminOverrideReason }
          : {}),
      });
      const row =
        existingRequest.requesterId === userId
          ? await dependencies.supplyService.cancel({
              actor,
              id,
              now: new Date(),
              requesterId: userId,
              ...(body.adminOverrideReason
                ? { adminOverrideReason: body.adminOverrideReason }
                : {}),
            })
          : await dependencies.supplyService.cancelById({
              actor,
              id,
              now: new Date(),
              ...(body.adminOverrideReason
                ? { adminOverrideReason: body.adminOverrideReason }
                : {}),
            });
      if (!row) {
        throw cannotCancelError();
      }
      return stockSupplyRequestResponseSchema.parse(toRequestResponse(row));
    },
  });
}

function registerConfirmReceiptRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  const route = supplyRequestRoutes.workerConfirmReceipt;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const { id } = request.params as { id: string };
      const body = confirmReceiptSchema.parse(request.body);
      const existingRequest =
        await dependencies.supplyRequestRepository.findById(id);
      if (!existingRequest) {
        throw new AppError({
          code: "not_found",
          detail:
            "Supply request not found or goods have not been dispatched yet.",
          statusCode: 404,
          title: "Cannot confirm receipt",
        });
      }

      await accessPolicy.assertCanConfirmReceipt({
        actor,
        supplyRequest: existingRequest,
        ...(body.adminOverrideReason
          ? { adminOverrideReason: body.adminOverrideReason }
          : {}),
      });
      const { supplyRequest } = await dependencies.supplyService.confirmReceipt(
        {
          actor,
          notes: body.notes ?? null,
          now: new Date(),
          receivedBy: userId,
          supplyRequestId: id,
          ...(body.adminOverrideReason
            ? { adminOverrideReason: body.adminOverrideReason }
            : {}),
        },
      );
      return stockSupplyRequestResponseSchema.parse(
        toRequestResponse(supplyRequest),
      );
    },
  });
}
