"use client";

import type {
  AdminPermissionSummary,
  AdminUserAccessDetail,
  AdminUserPermissionOverride,
} from "@shop/contracts";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { buildPermissionGroups } from "@/lib/access-control";
import { OVERRIDE_BADGE_CLASS_NAMES } from "@/lib/admin-models";
import {
  PermissionActions,
  PermissionStateBadge,
} from "./user-access-manage-permission-actions";
import { derivePermissionState } from "./user-access-manage-support";

export function UserAccessManagePermissionGroups({
  canManage,
  effectivePermissions,
  expandedGroups,
  permissions,
  setExpandedGroups,
  userOverrides,
  onAllow,
  onDeny,
  onRemoveOverride,
}: {
  canManage: boolean;
  effectivePermissions: AdminUserAccessDetail["effectivePermissions"];
  expandedGroups: ReadonlySet<string>;
  onAllow: (permissionKey: string) => void;
  onDeny: (permissionKey: string) => void;
  onRemoveOverride: (override: AdminUserPermissionOverride) => void;
  permissions: readonly AdminPermissionSummary[];
  setExpandedGroups: Dispatch<SetStateAction<Set<string>>>;
  userOverrides: readonly AdminUserPermissionOverride[];
}) {
  const groups = buildPermissionGroups(permissions);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No permissions match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.key);
        const grantedCount = group.items.filter((item) => {
          const state = derivePermissionState(
            item.key,
            effectivePermissions,
            userOverrides,
          );

          return state.kind === "role-grant" || state.kind === "allow-override";
        }).length;
        const overrideCount = group.items.filter((item) => {
          const state = derivePermissionState(
            item.key,
            effectivePermissions,
            userOverrides,
          );

          return (
            state.kind === "allow-override" || state.kind === "deny-override"
          );
        }).length;

        return (
          <div
            key={group.key}
            className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-none"
          >
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30"
              onClick={() =>
                setExpandedGroups((current) => {
                  const next = new Set(current);
                  next.has(group.key)
                    ? next.delete(group.key)
                    : next.add(group.key);
                  return next;
                })
              }
              type="button"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{group.label}</span>
                <Badge className="text-[0.65rem]" variant="secondary">
                  {grantedCount}/{group.items.length} granted
                </Badge>
                {overrideCount > 0 ? (
                  <Badge
                    className={`${OVERRIDE_BADGE_CLASS_NAMES.summary} text-[0.65rem]`}
                    variant="outline"
                  >
                    {overrideCount} override{overrideCount > 1 ? "s" : ""}
                  </Badge>
                ) : null}
              </div>
              {isExpanded ? (
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              )}
            </button>
            {isExpanded ? (
              <div className="divide-y divide-border/40 border-t border-border/60">
                {group.items.map((permission) => {
                  const state = derivePermissionState(
                    permission.key,
                    effectivePermissions,
                    userOverrides,
                  );
                  const override = userOverrides.find(
                    (item) => item.permissionKey === permission.key,
                  );

                  return (
                    <div
                      key={permission.key}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-xs text-foreground">
                            {permission.key}
                          </p>
                          <PermissionStateBadge state={state} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                        {override ? (
                          <p className="mt-1 text-xs italic text-muted-foreground/70">
                            Override reason: {override.reason}
                            {override.setByName
                              ? ` - ${override.setByName}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                      {canManage ? (
                        <PermissionActions
                          onAllow={() => onAllow(permission.key)}
                          onDeny={() => onDeny(permission.key)}
                          state={state}
                          {...(override
                            ? {
                                onRemoveOverride: () =>
                                  onRemoveOverride(override),
                              }
                            : {})}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
