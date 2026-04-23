"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  formatNotificationTimeLabel,
  getNotificationEventLabel,
  getNotificationPresentation,
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
  const presentation = getNotificationPresentation(notification);

  return (
    <article
      className={cn(
        "border border-border bg-muted/35 p-4",
        isPage ? "rounded-xl bg-card/80 shadow-sm" : "rounded-lg",
        notification.status === "read" && !isPage ? "opacity-75" : "",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{presentation.title}</p>
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
            {presentation.detail}
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
