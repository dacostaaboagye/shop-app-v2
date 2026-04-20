import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import { canActorReceivePlatformEvent } from "./platform-event-access.js";
import {
  toPlatformEventStreamMessage,
  type PlatformEventSubscriber,
} from "./platform-event.types.js";

const platformEventsStreamRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/events/stream",
};

type PlatformEventRouteDependencies = {
  eventSubscriber: PlatformEventSubscriber;
  permissionService: {
    assertHasPermission(input: {
      locationId?: string;
      permission: string;
      user: AuthenticatedActor;
    }): Promise<void>;
  };
};

const KEEPALIVE_INTERVAL_MS = 25_000;

export function registerPlatformEventRoutes(
  server: FastifyInstance,
  dependencies: PlatformEventRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: platformEventsStreamRoute.access },
    method: platformEventsStreamRoute.method,
    url: platformEventsStreamRoute.url,
    async handler(request, reply) {
      const actor = getAuthenticatedActor(request);

      reply.hijack();
      reply.raw.writeHead(200, {
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "content-type": "text/event-stream; charset=utf-8",
        "x-accel-buffering": "no",
      });

      writeSseFrame(reply.raw, "ready", {
        connectedAt: new Date().toISOString(),
      });

      const unsubscribe = dependencies.eventSubscriber.subscribe(async (event) => {
        if (
          !(await canActorReceivePlatformEvent(event, actor, {
            permissionService: dependencies.permissionService,
          }))
        ) {
          return;
        }

        writeSseFrame(
          reply.raw,
          "platform-event",
          toPlatformEventStreamMessage(event),
        );
      });

      const keepalive = setInterval(() => {
        reply.raw.write(": keepalive\n\n");
      }, KEEPALIVE_INTERVAL_MS);

      const cleanup = () => {
        clearInterval(keepalive);
        unsubscribe();
      };

      request.raw.on("close", cleanup);
      request.raw.on("error", cleanup);
    },
  });
}

function createUnavailableDependencies(): PlatformEventRouteDependencies {
  const unavailable = (): never => {
    throw new AppError({
      code: "internal_error",
      detail: "Platform event services are not configured for this environment.",
      statusCode: 503,
      title: "Platform events unavailable",
    });
  };

  return {
    eventSubscriber: {
      subscribe() {
        return unavailable();
      },
    },
    permissionService: {
      async assertHasPermission() {
        return unavailable();
      },
    },
  };
}

function getAuthenticatedActor(request: {
  auth?: AuthenticatedActor;
}): AuthenticatedActor {
  if (request.auth) {
    return request.auth;
  }

  throw new AppError({
    code: "internal_error",
    detail: "Authenticated actor context is unavailable for this route.",
    statusCode: 500,
    title: "Authorization unavailable",
  });
}

function writeSseFrame(
  replyRaw: NodeJS.WritableStream,
  eventName: string,
  payload: unknown,
) {
  const data = JSON.stringify(payload);
  replyRaw.write(`event: ${eventName}\n`);
  replyRaw.write(`data: ${data}\n\n`);
}
