import {
  confirmReceiptSchema,
  stockSupplyRequestResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { SupplyRequestAccessPolicy } from "./supply-request-access-policy.js";
import {
  getAuthenticatedActor,
  type StockSupplyRouteDependencies,
  supplyRequestRoutes,
  toRequestResponse,
} from "./supply-request-route-support.js";
import { cannotConfirmReceiptError } from "./supply-request-worker-route-support.js";

export function registerConfirmReceiptRoute(
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
        throw cannotConfirmReceiptError();
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
          ...(body.discrepancyNotes
            ? { discrepancyNotes: body.discrepancyNotes }
            : {}),
          ...(body.discrepancyReason
            ? { discrepancyReason: body.discrepancyReason }
            : {}),
          notes: body.notes ?? null,
          now: new Date(),
          receivedBy: userId,
          ...(body.receivedQuantity !== undefined
            ? { receivedQuantity: body.receivedQuantity }
            : {}),
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
