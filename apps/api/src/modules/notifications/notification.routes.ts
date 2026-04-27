import {
  markAllNotificationsReadResponseSchema,
  markNotificationReadResponseSchema,
  notificationListQuerySchema,
  notificationListResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { NotificationQueryService } from "./notification-query.service.js";
import type { NotificationWriteService } from "./notification-write.service.js";

type NotificationRouteDependencies = {
  notificationQueryService: Pick<NotificationQueryService, "listNotifications">;
  notificationWriteService: Pick<
    NotificationWriteService,
    "deleteNotification" | "markAllRead" | "markRead"
  >;
};

const notificationListRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/notifications",
};

const notificationMarkReadRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "PATCH",
  url: "/api/notifications/:notificationKey/read",
};

const notificationMarkAllReadRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "PATCH",
  url: "/api/notifications/read-all",
};

const notificationDeleteRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "DELETE",
  url: "/api/notifications/:notificationKey",
};

export function registerNotificationRoutes(
  server: FastifyInstance,
  dependencies: NotificationRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: notificationListRoute.access },
    method: notificationListRoute.method,
    url: notificationListRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const query = notificationListQuerySchema.parse(request.query);
      const result =
        await dependencies.notificationQueryService.listNotifications({
          limit: query.limit,
          userId,
        });

      return notificationListResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: notificationDeleteRoute.access },
    method: notificationDeleteRoute.method,
    url: notificationDeleteRoute.url,
    async handler(request, reply) {
      const userId = getAuthenticatedUserId(request);
      const { notificationKey } = request.params as { notificationKey: string };

      await dependencies.notificationWriteService.deleteNotification({
        notificationKey,
        userId,
      });

      return reply.status(204).send();
    },
  });

  server.route({
    config: { access: notificationMarkReadRoute.access },
    method: notificationMarkReadRoute.method,
    url: notificationMarkReadRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const { notificationKey } = request.params as { notificationKey: string };
      const result = await dependencies.notificationWriteService.markRead({
        notificationKey,
        now: new Date(),
        userId,
      });

      return markNotificationReadResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: notificationMarkAllReadRoute.access },
    method: notificationMarkAllReadRoute.method,
    url: notificationMarkAllReadRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const result = await dependencies.notificationWriteService.markAllRead({
        now: new Date(),
        userId,
      });

      return markAllNotificationsReadResponseSchema.parse(result);
    },
  });
}

function createUnavailableDependencies(): NotificationRouteDependencies {
  const unavailable = (): never => {
    throw new AppError({
      code: "internal_error",
      detail: "Notification services are not configured for this environment.",
      statusCode: 503,
      title: "Notifications unavailable",
    });
  };

  return {
    notificationQueryService: {
      async listNotifications() {
        return unavailable();
      },
    },
    notificationWriteService: {
      async deleteNotification() {
        return unavailable();
      },
      async markAllRead() {
        return unavailable();
      },
      async markRead() {
        return unavailable();
      },
    },
  };
}
