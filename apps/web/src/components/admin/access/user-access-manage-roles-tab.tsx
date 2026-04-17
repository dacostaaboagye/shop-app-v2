"use client";

import type {
  AdminRoleSummary,
  AdminUserRoleAssignment,
} from "@shop/contracts";
import { MapPin, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatAdminDate, ROLE_SCOPE_BADGE_CLASSES } from "@/lib/admin-models";

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
  const assignedSlugs = new Set(
    roleAssignments.map((assignment) => assignment.roleSlug),
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
      <Card className="border-border/70 bg-card shadow-none">
        <CardHeader>
          <CardTitle>Current assignments</CardTitle>
          <CardDescription>
            Active role assignments for this user. Revocation is immediate and
            audited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roleAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No roles currently assigned.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border/60">
              {roleAssignments.map((assignment) => (
                <div
                  key={`${assignment.roleSlug}:${assignment.locationSlug ?? "global"}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium leading-tight">
                      {assignment.roleName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{assignment.roleSlug}</span>
                      {assignment.locationName ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {assignment.locationName}
                        </span>
                      ) : (
                        <Badge className="text-[0.65rem]" variant="secondary">
                          Global
                        </Badge>
                      )}
                      <span>
                        Assigned {formatAdminDate(assignment.assignedAt)}
                        {assignment.assignedByName
                          ? ` by ${assignment.assignedByName}`
                          : ""}
                      </span>
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
        </CardContent>
      </Card>

      {canManage ? (
        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader>
            <CardTitle>Role catalogue</CardTitle>
            <CardDescription>
              Assign a role to extend this user's portal access and permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => setRoleSearch(event.target.value)}
                placeholder="Search roles by name, slug, or description"
                value={roleSearch}
              />
            </div>

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
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium leading-tight">
                            {role.name}
                          </p>
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
                        <p className="mt-1 text-xs text-muted-foreground">
                          {role.description}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground/70">
                          {role.slug} · {role.permissionCount} permissions ·{" "}
                          {role.assignedUserCount} users
                        </p>
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
