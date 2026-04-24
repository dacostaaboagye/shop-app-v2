import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { ResendEmailWebhookService } from "./resend-email-webhook.service.js";

type EmailWebhookRouteDependencies = {
  resendWebhookService: Pick<ResendEmailWebhookService, "handleWebhook">;
};

const resendWebhookRoute: RouteDefinition = {
  access: { kind: "public" },
  method: "POST",
  url: "/resend",
};

export function registerEmailWebhookRoutes(
  server: FastifyInstance,
  dependencies: EmailWebhookRouteDependencies = createUnavailableDependencies(),
) {
  server.register(
    async function emailWebhookScope(scope) {
      scope.addContentTypeParser(
        "application/json",
        { parseAs: "string" },
        (_request, body, done) => done(null, body),
      );

      scope.route({
        config: { access: resendWebhookRoute.access },
        method: resendWebhookRoute.method,
        url: resendWebhookRoute.url,
        async handler(request, reply) {
          const payload =
            typeof request.body === "string"
              ? request.body
              : JSON.stringify(request.body);
          const headers = {
            id: normalizeHeader(request.headers["svix-id"]),
            signature: normalizeHeader(request.headers["svix-signature"]),
            timestamp: normalizeHeader(request.headers["svix-timestamp"]),
          };
          const result = await dependencies.resendWebhookService.handleWebhook({
            headers,
            payload,
          });

          return reply.status(200).send({ ok: true, ...result });
        },
      });
    },
    { prefix: "/api/messaging/webhooks" },
  );
}

function createUnavailableDependencies(): EmailWebhookRouteDependencies {
  return {
    resendWebhookService: {
      async handleWebhook() {
        throw new AppError({
          code: "internal_error",
          detail: "Messaging webhooks are not configured.",
          statusCode: 503,
          title: "Messaging unavailable",
        });
      },
    },
  };
}

function normalizeHeader(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
