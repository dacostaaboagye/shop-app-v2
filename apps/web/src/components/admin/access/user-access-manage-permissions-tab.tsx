"use client";

import type {
  AdminPermissionSummary,
  AdminUserAccessDetail,
  AdminUserPermissionOverride,
} from "@shop/contracts";
import { useState } from "react";
import {
  buildPermissionGroups,
  getPermissionGroupKey,
} from "@/lib/access-control";
import { UserAccessManagePermissionGroups } from "./user-access-manage-permission-groups";
import { UserAccessManagePermissionToolbar } from "./user-access-manage-permission-toolbar";
import { derivePermissionState } from "./user-access-manage-support";

export function UserAccessManagePermissionsTab({
  allPermissions,
  canManage,
  effectivePermissions,
  onAllow,
  onDeny,
  onRemoveOverride,
  userOverrides,
}: {
  allPermissions: readonly AdminPermissionSummary[];
  canManage: boolean;
  effectivePermissions: AdminUserAccessDetail["effectivePermissions"];
  onAllow: (permissionKey: string) => void;
  onDeny: (permissionKey: string) => void;
  onRemoveOverride: (override: AdminUserPermissionOverride) => void;
  userOverrides: readonly AdminUserPermissionOverride[];
}) {
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [showFilter, setShowFilter] = useState<"all" | "granted" | "overrides">(
    "all",
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const normalizedQuery = search.trim().toLowerCase();
  const filteredPermissions = allPermissions.filter((permission) => {
    if (
      normalizedQuery &&
      !`${permission.key} ${permission.description}`
        .toLowerCase()
        .includes(normalizedQuery)
    ) {
      return false;
    }

    if (
      domainFilter &&
      getPermissionGroupKey(permission.key) !== domainFilter
    ) {
      return false;
    }

    const state = derivePermissionState(
      permission.key,
      effectivePermissions,
      userOverrides,
    );

    if (showFilter === "granted") {
      return state.kind === "role-grant" || state.kind === "allow-override";
    }

    if (showFilter === "overrides") {
      return state.kind === "allow-override" || state.kind === "deny-override";
    }

    return true;
  });
  const domains = buildPermissionGroups(allPermissions).map((group) => ({
    key: group.key,
    label: group.label,
  }));
  const hasFilters =
    normalizedQuery !== "" || domainFilter !== "" || showFilter !== "all";

  return (
    <div className="flex flex-col gap-4">
      <UserAccessManagePermissionToolbar
        domainFilter={domainFilter}
        domains={domains}
        hasFilters={hasFilters}
        onClear={() => {
          setSearch("");
          setDomainFilter("");
          setShowFilter("all");
        }}
        onCollapseAll={() => setExpandedGroups(new Set())}
        onDomainFilterChange={setDomainFilter}
        onExpandAll={() =>
          setExpandedGroups(
            new Set(
              buildPermissionGroups(filteredPermissions).map(
                (group) => group.key,
              ),
            ),
          )
        }
        onSearchChange={setSearch}
        onShowFilterChange={setShowFilter}
        search={search}
        showFilter={showFilter}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          {filteredPermissions.length} of {allPermissions.length} permissions
        </span>
        <span className="text-border">·</span>
        <span>
          {userOverrides.filter((item) => item.effect === "allow").length} allow
          overrides
        </span>
        <span className="text-border">·</span>
        <span>
          {userOverrides.filter((item) => item.effect === "deny").length} deny
          overrides
        </span>
      </div>

      <UserAccessManagePermissionGroups
        canManage={canManage}
        effectivePermissions={effectivePermissions}
        expandedGroups={expandedGroups}
        onAllow={onAllow}
        onDeny={onDeny}
        onRemoveOverride={onRemoveOverride}
        permissions={filteredPermissions}
        setExpandedGroups={setExpandedGroups}
        userOverrides={userOverrides}
      />
    </div>
  );
}
