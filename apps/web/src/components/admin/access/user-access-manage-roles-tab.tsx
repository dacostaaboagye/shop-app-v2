"use client";

import type {
  AdminRoleSummary,
  AdminUserRoleAssignment,
} from "@shop/contracts";
import { MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AccessActionBadge,
  AccessCountCell,
  AccessNameCell,
  AccessTextCell,
} from "@/components/admin/access/access-table-cells";
import { AdminDirectoryFilterPanel } from "@/components/admin/admin-directory-filter-panel";
import { CatalogFormCard } from "@/components/admin/catalog/catalog-form-surfaces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAdminDate, ROLE_SCOPE_BADGE_CLASSES } from "@/lib/admin-models";
import { formatCount } from "@/lib/display/format";

function AssignmentScope({
  locationName,
}: {
  locationName?: string | null | undefined;
}) {
  return locationName ? (
    <span className="type-support flex items-center gap-1 text-muted-foreground">
      <MapPin className="size-3" />
      {locationName}
    </span>
  ) : (
    <Badge className="text-[0.65rem]" variant="secondary">
      Global
    </Badge>
  );
}

export function UserAccessManageRolesTab({
  allRoles,
  canManage,
  onAssignRole,
  onRevokeRole,
  roleAssignments,
}: {
  allRoles: readonly AdminRoleSummary[];
  canManage: boolean;
  onAssignRole: (roleSlug: string, roleName: string) => void;
  onRevokeRole: (assignment: AdminUserRoleAssignment) => void;
  roleAssignments: readonly AdminUserRoleAssignment[];
}) {
  const [roleSearch, setRoleSearch] = useState("");
  const assignedSlugs = useMemo(
    () => new Set(roleAssignments.map((assignment) => assignment.roleSlug)),
    [roleAssignments],
  );
  const normalizedQuery = roleSearch.trim().toLowerCase();
  const filteredRoles = allRoles.filter((role) =>
    normalizedQuery
      ? `${role.name} ${role.slug} ${role.description}`
          .toLowerCase()
          .includes(normalizedQuery)
      : true,
  );

  return (
    <div className="flex flex-col gap-4">
      <CatalogFormCard
        description="Role assignments take effect immediately and every revoke action is audited."
        title="Current assignments"
      >
        {roleAssignments.length === 0 ? (
          <p className="type-support text-muted-foreground">
            No roles are currently assigned.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {roleAssignments.map((assignment) => (
              <div
                key={`${assignment.roleSlug}:${assignment.locationSlug ?? "global"}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <AccessNameCell
                    name={assignment.roleName}
                    slug={assignment.roleSlug}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <AssignmentScope locationName={assignment.locationName} />
                    <AccessTextCell
                      value={`Assigned ${formatAdminDate(assignment.assignedAt)}${assignment.assignedByName ? ` by ${assignment.assignedByName}` : ""}`}
                    />
                  </div>
                </div>
                {canManage ? (
                  <Button
                    onClick={() => onRevokeRole(assignment)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="size-3.5" />
                    Revoke
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CatalogFormCard>

      {canManage ? (
        <CatalogFormCard
          description="Assign a role to extend this user's portal access. Manager and worker roles remain location-scoped."
          title="Role catalogue"
        >
          <div className="flex flex-col gap-3">
            <AdminDirectoryFilterPanel
              hasFilters={normalizedQuery !== ""}
              onClear={() => setRoleSearch("")}
              onDraftSearchChange={setRoleSearch}
              placeholder="Role name, slug, or description"
              searchId="user-access-role-search"
              summary={`${formatCount(filteredRoles.length)} of ${formatCount(allRoles.length)} roles visible`}
              value={roleSearch}
            />

            {filteredRoles.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No roles match the current search.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border/60">
                {filteredRoles.map((role) => {
                  const isAssigned = assignedSlugs.has(role.slug);

                  return (
                    <div
                      key={role.slug}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <AccessNameCell
                          description={role.description}
                          name={role.name}
                          slug={role.slug}
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <AccessActionBadge>
                            <AccessCountCell value={role.permissionCount} />{" "}
                            permissions
                          </AccessActionBadge>
                          <AccessActionBadge>
                            <AccessCountCell value={role.assignedUserCount} />{" "}
                            users
                          </AccessActionBadge>
                          {role.isSystem ? (
                            <Badge
                              className="text-[0.65rem]"
                              variant="secondary"
                            >
                              System
                            </Badge>
                          ) : null}
                          {isAssigned ? (
                            <Badge
                              className={`${ROLE_SCOPE_BADGE_CLASSES.custom} text-[0.65rem]`}
                              variant="outline"
                            >
                              Assigned
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      {!isAssigned ? (
                        <Button
                          onClick={() => onAssignRole(role.slug, role.name)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <ShieldCheck className="size-3.5" />
                          Assign
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CatalogFormCard>
      ) : null}
    </div>
  );
}
