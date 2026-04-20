"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  formatNotificationTimeLabel,
  getNotificationActorLabel,
  getNotificationEventLabel,
} from "@/lib/notifications/notification-presentation";
import type { fetchNotifications } from "@/lib/react-query/notifications";
import { cn } from "@/lib/utils";

export type NotificationFeedItem = Awaited<
  ReturnType<typeof fetchNotifications>
>["items"][number];

export function NotificationFeedCard({
  notification,
  onMarkRead,
  pending = false,
  showStatus = false,
  variant = "dialog",
}: {
  notification: NotificationFeedItem;
  onMarkRead?: () => void;
  pending?: boolean;
  showStatus?: boolean;
  variant?: "dialog" | "page";
}) {
  const isPage = variant === "page";

  return (
    <article
      className={cn(
        "border border-border bg-muted/35 p-4",
        isPage ? "rounded-2xl bg-card/80 shadow-xs" : "rounded-lg",
        notification.status === "read" && !isPage ? "opacity-75" : "",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{notification.summary}</p>
            {showStatus ? (
              <Badge
                variant={
                  notification.status === "unread" ? "default" : "outline"
                }
              >
                {notification.status === "unread" ? "Unread" : "Read"}
              </Badge>
            ) : null}
            <Badge variant="outline">
              {getNotificationEventLabel(notification.eventType)}
            </Badge>
            {!isPage ? (
              <Badge variant="outline">
                {formatNotificationTimeLabel(notification.occurredAt)}
              </Badge>
            ) : null}
          </div>
          <p
            className={
              isPage
                ? "text-sm text-muted-foreground"
                : "text-xs text-muted-foreground"
            }
          >
            {getNotificationActorLabel(notification)}
            {isPage ? " updated " : " • "}
            <span className={isPage ? "font-medium text-foreground" : ""}>
              {notification.resource.reference}
            </span>
            {isPage ? "." : ""}
          </p>
          {isPage ? (
            <p className="text-xs text-muted-foreground">
              {formatNotificationTimeLabel(notification.occurredAt)}
            </p>
          ) : null}
        </div>

        {notification.status === "unread" && onMarkRead ? (
          <Button
            disabled={pending}
            onClick={onMarkRead}
            size="sm"
            type="button"
            variant="outline"
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Mark read
          </Button>
        ) : null}
      </div>
    </article>
  );
}
