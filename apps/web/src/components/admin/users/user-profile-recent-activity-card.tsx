"use client";

import type { AdminUserAccessDetail } from "@shop/contracts";
import { ActivityIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatAdminDate } from "@/lib/admin-models";
import {
  getUserProfileActivityKey,
  USER_PROFILE_EVENT_TYPE_LABELS,
} from "./user-profile-activity.support";

export function UserProfileRecentActivityCard({
  recentActivity,
}: Pick<AdminUserAccessDetail, "recentActivity">) {
  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ActivityIcon className="size-4 text-muted-foreground" />
          Recent activity
        </CardTitle>
        <CardDescription>
          Last {Math.min(recentActivity.length, 8)} authentication events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentActivity.slice(0, 8).map((event) => (
              <div
                key={getUserProfileActivityKey(event)}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/15 px-3 py-2"
              >
                <Badge className="shrink-0" variant="secondary">
                  {USER_PROFILE_EVENT_TYPE_LABELS[event.eventType] ??
                    event.eventType}
                </Badge>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {event.ipAddress ?? "-"}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatAdminDate(event.occurredAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
