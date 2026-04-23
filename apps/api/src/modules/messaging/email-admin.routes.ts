import {
  emailOperationsResponseSchema,
  sendTestEmailRequestSchema,
  sendTestEmailResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { EmailOperationsService } from "./email-operations.service.js";

type EmailAdminRouteDependencies = {
  operationsService: Pick<
    EmailOperationsService,
    "getOperationsOverview" | "sendTestEmail"
  >;
};

const getEmailOperationsRoute: RouteDefinition = {
  access: { kind: "permission", permission: "settings.documents.view" },
  method: "GET",
  url: "/api/admin/settings/email/operations",
};

const sendTestEmailRoute: RouteDefinition = {
  access: { kind: "permission", permission: "settings.documents.manage" },
  method: "POST",
  url: "/api/admin/settings/email/test-send",
};

export function registerEmailAdminRoutes(
  server: FastifyInstance,
  dependencies: EmailAdminRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: getEmailOperationsRoute.access },
    method: getEmailOperationsRoute.method,
    url: getEmailOperationsRoute.url,
    async handler() {
      const result = await dependencies.operationsService.getOperationsOverview(
        {
          now: new Date(),
        },
      );

      return emailOperationsResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: sendTestEmailRoute.access },
    method: sendTestEmailRoute.method,
    url: sendTestEmailRoute.url,
    async handler(request, reply) {
      const payload = sendTestEmailRequestSchema.parse(request.body);
      await dependencies.operationsService.sendTestEmail(payload);
      return reply
        .status(200)
        .send(sendTestEmailResponseSchema.parse({ ok: true }));
    },
  });
}

function createUnavailableDependencies(): EmailAdminRouteDependencies {
  return {
    operationsService: {
      async getOperationsOverview() {
        throw unavailableMessagingError();
      },
      async sendTestEmail() {
        throw unavailableMessagingError();
      },
    },
  };
}

function unavailableMessagingError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Messaging operations are not configured.",
    statusCode: 503,
    title: "Messaging unavailable",
  });
}
