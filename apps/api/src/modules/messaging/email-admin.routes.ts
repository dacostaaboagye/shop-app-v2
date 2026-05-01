import {
  adminSentCommunicationListQuerySchema,
  adminSentCommunicationListResponseSchema,
  emailHealthResponseSchema,
  emailOperationsResponseSchema,
  emailRecipientStateQuerySchema,
  emailRecipientStateResponseSchema,
  sendAdminCommunicationRequestSchema,
  sendAdminCommunicationResponseSchema,
  sendTestEmailRequestSchema,
  sendTestEmailResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedActor } from "../stock/supply-request-route-support.js";
import type { AdminCommunicationService } from "./admin-communication.service.js";
import type { AdminCommunicationQueryService } from "./admin-communication-query.service.js";
import type { EmailOperationsService } from "./email-operations.service.js";

type EmailAdminRouteDependencies = {
  adminCommunicationQueryService: Pick<
    AdminCommunicationQueryService,
    "listSent"
  > | null;
  adminCommunicationService: Pick<AdminCommunicationService, "send"> | null;
  operationsService: Pick<
    EmailOperationsService,
    | "getHealth"
    | "getOperationsOverview"
    | "getRecipientState"
    | "sendTestEmail"
  >;
};

const getEmailOperationsRoute: RouteDefinition = {
  access: { kind: "permission", permission: "settings.documents.view" },
  method: "GET",
  url: "/api/admin/settings/email/operations",
};

const getEmailHealthRoute: RouteDefinition = {
  access: { kind: "permission", permission: "settings.documents.view" },
  method: "GET",
  url: "/api/admin/settings/email/health",
};

const sendTestEmailRoute: RouteDefinition = {
  access: { kind: "permission", permission: "settings.documents.manage" },
  method: "POST",
  url: "/api/admin/settings/email/test-send",
};

const getRecipientStateRoute: RouteDefinition = {
  access: { kind: "permission", permission: "settings.documents.view" },
  method: "GET",
  url: "/api/admin/settings/email/recipient-state",
};

const sendAdminCommunicationRoute: RouteDefinition = {
  access: { kind: "permission", permission: "admin.dashboard.view" },
  method: "POST",
  url: "/api/admin/notifications/compose",
};

const listSentAdminCommunicationRoute: RouteDefinition = {
  access: { kind: "permission", permission: "admin.dashboard.view" },
  method: "GET",
  url: "/api/admin/notifications/sent",
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
    config: { access: getEmailHealthRoute.access },
    method: getEmailHealthRoute.method,
    url: getEmailHealthRoute.url,
    async handler() {
      const result = await dependencies.operationsService.getHealth({
        now: new Date(),
      });
      return emailHealthResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: getRecipientStateRoute.access },
    method: getRecipientStateRoute.method,
    url: getRecipientStateRoute.url,
    async handler(request) {
      const query = emailRecipientStateQuerySchema.parse(request.query);
      const result = await dependencies.operationsService.getRecipientState({
        recipientEmail: query.email,
      });
      return emailRecipientStateResponseSchema.parse(result);
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

  server.route({
    config: { access: listSentAdminCommunicationRoute.access },
    method: listSentAdminCommunicationRoute.method,
    url: listSentAdminCommunicationRoute.url,
    async handler(request) {
      if (!dependencies.adminCommunicationQueryService) {
        throw unavailableMessagingError();
      }

      const query = adminSentCommunicationListQuerySchema.parse(request.query);
      const result =
        await dependencies.adminCommunicationQueryService.listSent(query);
      return adminSentCommunicationListResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: sendAdminCommunicationRoute.access },
    method: sendAdminCommunicationRoute.method,
    url: sendAdminCommunicationRoute.url,
    async handler(request, reply) {
      if (!dependencies.adminCommunicationService) {
        throw unavailableMessagingError();
      }

      const actor = getAuthenticatedActor(request);
      const payload = sendAdminCommunicationRequestSchema.parse(request.body);
      const result = await dependencies.adminCommunicationService.send({
        actorUserSlug: actor.userSlug,
        messageBody: payload.messageBody,
        now: new Date(),
        sendEmail: payload.sendEmail,
        sendNotification: payload.sendNotification,
        subject: payload.subject,
        target:
          payload.target.kind === "audience"
            ? {
                audience: {
                  ...(payload.target.audience.locationId
                    ? { locationId: payload.target.audience.locationId }
                    : {}),
                  permission: payload.target.audience.permission,
                },
                kind: "audience",
              }
            : {
                kind: "user",
                recipient: {
                  userSlug: payload.target.recipient.userSlug,
                },
              },
      });

      return reply
        .status(200)
        .send(sendAdminCommunicationResponseSchema.parse(result));
    },
  });
}

function createUnavailableDependencies(): EmailAdminRouteDependencies {
  return {
    adminCommunicationQueryService: null,
    adminCommunicationService: null,
    operationsService: {
      async getHealth() {
        throw unavailableMessagingError();
      },
      async getOperationsOverview() {
        throw unavailableMessagingError();
      },
      async getRecipientState() {
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
