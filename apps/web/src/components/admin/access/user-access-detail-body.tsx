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
import { CatalogFormCard } from "@/components/admin/catalog/catalog-form-surfaces";
import { PageHeader, StatCard } from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { PersonAvatar } from "@/components/system/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatAdminDate,
  formatDisplayName,
  formatPortalLabel,
  PASSWORD_RESET_BADGE_CLASS_NAME,
  USER_STATUS_META,
} from "@/lib/admin-models";
import { formatCount } from "@/lib/display/format";
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
  const displayName = formatDisplayName(user.firstName, user.lastName);

  return (
    <>
      <PageHeader
        backHref={toRoute("/admin/access/users")}
        backLabel="User access"
        description="Review effective access, current role assignments, portal reach, and recent authentication history."
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

      <CatalogFormCard
        description="Identity, portal reach, account status, and current location scope."
        title="User summary"
      >
        <UserAccessSummaryCard user={user} />
      </CatalogFormCard>

      <MediaPanel
        canManage={canManageMedia}
        entitySlug={slug}
        entityType="user"
      />

      <Tabs className="flex flex-col gap-4" defaultValue="effective">
        <TabsList>
          <TabsTrigger value="effective">Effective access</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent className="mt-0" value="effective">
          <EffectiveAccessTab permissions={user.effectivePermissions} />
        </TabsContent>
        <TabsContent className="mt-0" value="activity">
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

export function UserAccessSummaryCard({
  user,
}: {
  user: AdminUserAccessDetail;
}) {
  const statusMeta =
    USER_STATUS_META[user.status as keyof typeof USER_STATUS_META];
  const displayName = formatDisplayName(user.firstName, user.lastName);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <PersonAvatar
        firstName={user.firstName}
        imageUrl={user.primaryImageUrl}
        lastName={user.lastName}
        size="md"
      />
      <div className="min-w-0">
        <p className="font-medium leading-tight text-foreground">
          {displayName}
        </p>
        <p className="type-identifier text-muted-foreground">{user.email}</p>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {statusMeta ? (
          <Badge className={statusMeta.className} variant="outline">
            {statusMeta.label}
          </Badge>
        ) : null}
        {user.requiresPasswordChange ? (
          <Badge className={PASSWORD_RESET_BADGE_CLASS_NAME} variant="outline">
            Password reset required
          </Badge>
        ) : null}
        {user.availablePortals.length > 0 ? (
          user.availablePortals.map((portal) => (
            <Badge key={portal} variant="secondary">
              {formatPortalLabel(portal)}
            </Badge>
          ))
        ) : (
          <Badge className="text-muted-foreground" variant="outline">
            No portal access
          </Badge>
        )}
        {user.assignedLocations.length > 0 ? (
          <span className="type-support flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-3.5" />
            {user.assignedLocations
              .slice(0, 2)
              .map((location) => location.locationName)
              .join(", ")}
            {user.assignedLocations.length > 2
              ? ` +${formatCount(user.assignedLocations.length - 2)} more`
              : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}
