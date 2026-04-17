"use client";

import type { AdminUserAccessDetail } from "@shop/contracts";
import { CalendarDays, Clock, LogIn, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { MediaPanel } from "@/components/admin/catalog/media/media-panel";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatAdminDate,
  formatDisplayName,
  getInitials,
  PASSWORD_RESET_BADGE_CLASS_NAME,
  ROLE_BADGE_CLASSES,
  type RoleKey,
  USER_STATUS_META,
} from "@/lib/admin-models";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { UserProfileRecentActivityCard } from "./user-profile-recent-activity-card";

export function UserProfileBody({
  canManageAccess,
  canManageMedia,
  slug,
  user,
}: {
  canManageAccess: boolean;
  canManageMedia: boolean;
  slug: string;
  user: AdminUserAccessDetail;
}) {
  const statusMeta =
    USER_STATUS_META[user.status as keyof typeof USER_STATUS_META];
  const displayName = formatDisplayName(user.firstName, user.lastName);
  const hasNonBasicRole = user.roleAssignments.some(
    (assignment) => assignment.roleSlug !== "basic_user",
  );

  return (
    <PageShell>
      <PageHeader
        actions={
          hasNonBasicRole && canManageAccess ? (
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={toRoute(`/admin/access/users/${encodeURIComponent(slug)}`)}
            >
              <ShieldCheck className="size-3.5" />
              Manage access
            </Link>
          ) : undefined
        }
        avatar={
          <Avatar className="size-14 shrink-0 rounded-xl">
            <AvatarFallback className="rounded-xl text-lg">
              {getInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
        }
        backHref={toRoute("/admin/users")}
        image={user.primaryImageUrl ?? null}
        backLabel="Users"
        description={user.email}
        eyebrow="User profile"
        title={displayName}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Active role assignments on this account."
          icon={ShieldCheck}
          label="Roles"
          value={user.roleAssignments.length}
        />
        <StatCard
          description="Locations this user is assigned to."
          icon={MapPin}
          label="Locations"
          value={user.assignedLocations.length}
        />
        <StatCard
          description="Last successful authentication event."
          icon={LogIn}
          label="Last login"
          value={user.lastLoginAt ? formatAdminDate(user.lastLoginAt) : "Never"}
        />
        <StatCard
          description="Date this account was created."
          icon={CalendarDays}
          label="Member since"
          value={formatAdminDate(
            user.recentActivity[user.recentActivity.length - 1]?.occurredAt ??
              new Date().toISOString(),
          )}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.6fr]">
        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>
              Profile details, account status, and portal access.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <Avatar className="size-12">
                {user.primaryImageUrl ? (
                  <AvatarImage alt={displayName} src={user.primaryImageUrl} />
                ) : null}
                <AvatarFallback className="text-base">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold leading-tight">{displayName}</p>
                <p className="font-mono text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {statusMeta ? (
                <Badge className={statusMeta.className} variant="outline">
                  {statusMeta.label}
                </Badge>
              ) : null}
              {user.requiresPasswordChange ? (
                <Badge
                  className={PASSWORD_RESET_BADGE_CLASS_NAME}
                  variant="outline"
                >
                  <Clock className="size-3" />
                  Password reset required
                </Badge>
              ) : null}
              {user.roleAssignments.map((assignment) => (
                <Badge
                  key={`${assignment.roleSlug}:${assignment.locationSlug ?? "global"}`}
                  className={cn(
                    "capitalize text-[0.68rem]",
                    ROLE_BADGE_CLASSES[assignment.roleSlug as RoleKey] ??
                      "border-border bg-muted/25",
                  )}
                  variant="outline"
                >
                  {assignment.roleName}
                </Badge>
              ))}
            </div>

            {user.availablePortals.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Portal access
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {user.availablePortals.map((portal) => (
                    <Badge
                      key={portal}
                      className="capitalize"
                      variant="secondary"
                    >
                      {portal}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No portal access. Assign a staff role to enable portal entry.
              </p>
            )}

            {user.assignedLocations.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Assigned locations
                </p>
                <div className="flex flex-col gap-1">
                  {user.assignedLocations.map((location) => (
                    <span
                      key={location.locationSlug}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground"
                    >
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground/60" />
                      {location.locationName}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <UserProfileRecentActivityCard recentActivity={user.recentActivity} />
      </div>

      <MediaPanel
        canManage={canManageMedia}
        entitySlug={user.slug}
        entityType="user"
      />
    </PageShell>
  );
}
