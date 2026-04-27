"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  formatNotificationTimeLabel,
  getNotificationEventLabel,
  getNotificationPresentation,
  getNotificationStatusLabel,
} from "@/lib/notifications/notification-presentation";
import type { fetchNotifications } from "@/lib/react-query/notifications";
import { cn } from "@/lib/utils";

export type NotificationFeedItem = Awaited<
  ReturnType<typeof fetchNotifications>
>["items"][number];

export function NotificationFeedCard({
  deletePending = false,
  notification,
  onDelete,
  onMarkRead,
  pending = false,
  showStatus = false,
  variant = "dialog",
}: {
  deletePending?: boolean;
  notification: NotificationFeedItem;
  onDelete?: () => void;
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
        notification.status === "unread"
          ? "border-primary/15 bg-primary/5"
          : "",
        notification.status === "read" && !isPage ? "opacity-75" : "",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="type-data-value">{presentation.title}</p>
            {showStatus ? (
              <Badge
                variant={
                  notification.status === "unread" ? "default" : "outline"
                }
              >
                {getNotificationStatusLabel(notification.status)}
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
          <p className={isPage ? "type-support" : "type-support text-xs"}>
            {presentation.detail}
          </p>
          {isPage ? (
            <p className="type-support text-xs">
              {formatNotificationTimeLabel(notification.occurredAt)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {notification.status === "unread" && onMarkRead ? (
            <Button
              disabled={pending || deletePending}
              onClick={onMarkRead}
              size="sm"
              type="button"
              variant="outline"
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Mark Read
            </Button>
          ) : null}
          {isPage && onDelete ? (
            <Button
              disabled={deletePending || pending}
              onClick={onDelete}
              size="sm"
              type="button"
              variant="outline"
            >
              {deletePending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Trash2 data-icon="inline-start" />
              )}
              Delete
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
