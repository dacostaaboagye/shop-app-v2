"use client";

import type { AdminUserAccessDetail } from "@shop/contracts";
import {
  Clock,
  KeyRound,
  MapPin,
  Settings2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader, StatCard } from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatAdminDate,
  formatDisplayName,
  getInitials,
  PASSWORD_RESET_BADGE_CLASS_NAME,
  USER_STATUS_META,
} from "@/lib/admin-models";
import { toRoute } from "@/lib/routes";
import { MediaPanel } from "../catalog/media/media-panel";
import { ActivityTab, EffectiveAccessTab } from "./user-access-detail-tabs";
import { ForcePasswordResetDialog } from "./user-access-force-password-reset-dialog";
import { UpdateStatusDialog } from "./user-access-update-status-dialog";

type DialogState =
  | { kind: "closed" }
  | { kind: "update-status" }
  | { kind: "force-password-reset" };

export function UserAccessDetailBody({
  canManageMedia,
  slug,
  user,
}: {
  canManageMedia: boolean;
  slug: string;
  user: AdminUserAccessDetail;
}) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const closeDialog = () => setDialog({ kind: "closed" });
  const statusMeta =
    USER_STATUS_META[user.status as keyof typeof USER_STATUS_META];
  const displayName = formatDisplayName(user.firstName, user.lastName);

  return (
    <>
      <PageHeader
        backHref={toRoute("/admin/access/users")}
        backLabel="User access"
        description={user.email}
        eyebrow="Access overview"
        title={displayName}
        actions={
          <PermissionGate permission="access.assignments.manage">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className={buttonVariants({ size: "sm" })}
                href={toRoute(
                  `/admin/access/users/${encodeURIComponent(slug)}/manage`,
                )}
              >
                <Settings2 className="size-3.5" />
                Manage roles & permissions
              </Link>
              <Button
                onClick={() => setDialog({ kind: "update-status" })}
                size="sm"
                type="button"
                variant="outline"
              >
                Update status
              </Button>
              <Button
                onClick={() => setDialog({ kind: "force-password-reset" })}
                size="sm"
                type="button"
                variant="outline"
              >
                Force reset
              </Button>
            </div>
          </PermissionGate>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Active role assignments."
          icon={ShieldCheck}
          label="Roles"
          value={user.roleAssignments.length}
        />
        <StatCard
          description="Effective permissions from roles and overrides."
          icon={KeyRound}
          label="Effective permissions"
          value={user.effectivePermissions.length}
        />
        <StatCard
          description="Active allow or deny overrides."
          icon={ShieldAlert}
          label="Overrides"
          value={user.userOverrides.length}
        />
        <StatCard
          description="Last successful authentication."
          icon={Clock}
          label="Last login"
          value={user.lastLoginAt ? formatAdminDate(user.lastLoginAt) : "Never"}
        />
      </div>

      <Card className="border-border/70 bg-card shadow-none">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Avatar className="size-10">
            <AvatarFallback>
              {getInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium leading-tight">{displayName}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
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
                Password reset required
              </Badge>
            ) : null}
            {user.availablePortals.length > 0 ? (
              user.availablePortals.map((portal) => (
                <Badge key={portal} className="capitalize" variant="secondary">
                  {portal}
                </Badge>
              ))
            ) : (
              <Badge className="text-muted-foreground" variant="outline">
                No portal access
              </Badge>
            )}
            {user.assignedLocations.length > 0 ? (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5" />
                {user.assignedLocations
                  .slice(0, 2)
                  .map((location) => location.locationName)
                  .join(", ")}
                {user.assignedLocations.length > 2
                  ? ` +${user.assignedLocations.length - 2} more`
                  : ""}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <MediaPanel
        canManage={canManageMedia}
        entitySlug={slug}
        entityType="user"
      />

      <Tabs defaultValue="effective">
        <TabsList variant="line">
          <TabsTrigger value="effective">Effective access</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent className="pt-3" value="effective">
          <EffectiveAccessTab permissions={user.effectivePermissions} />
        </TabsContent>
        <TabsContent className="pt-3" value="activity">
          <ActivityTab events={user.recentActivity} />
        </TabsContent>
      </Tabs>

      <UpdateStatusDialog
        currentStatus={user.status}
        onClose={closeDialog}
        open={dialog.kind === "update-status"}
        slug={slug}
      />
      <ForcePasswordResetDialog
        onClose={closeDialog}
        open={dialog.kind === "force-password-reset"}
        slug={slug}
      />
    </>
  );
}
