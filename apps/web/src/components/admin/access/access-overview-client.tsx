"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList, KeyRound, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppEmptyState } from "@/components/system/app-empty-state";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchAdminAudit,
  fetchAdminPermissions,
  fetchAdminRoles,
} from "@/lib/react-query/admin-access";
import { toRoute } from "@/lib/routes";
import {
  ACCESS_AUDIT_SKELETON_KEYS,
  AccessLinkCard,
  getAuditEntryKey,
} from "./access-overview-support";

export function AccessOverviewClient() {
  const { can, permissions: currentPermissions } = useAuthorization();
  const canViewAudit = can("access.audit.view");
  const canViewPermissions = can("access.permissions.view");
  const rolesQuery = useQuery({
    queryFn: () => fetchAdminRoles({ page: 1, pageSize: 5, q: "" }),
    queryKey: ["admin", "access", "overview", "roles"],
  });
  const permissionsQuery = useQuery({
    enabled: canViewPermissions,
    queryFn: () => fetchAdminPermissions({ page: 1, pageSize: 6, q: "" }),
    queryKey: ["admin", "access", "overview", "permissions"],
  });
  const auditQuery = useQuery({
    enabled: canViewAudit,
    queryFn: () => fetchAdminAudit({ page: 1, pageSize: 5 }),
    queryKey: ["admin", "access", "overview", "audit"],
  });
  const accessPermissionCount = currentPermissions.filter((permission) =>
    permission.startsWith("access."),
  ).length;

  return (
    <PageShell>
      <PageHeader
        description="A single control surface for role definitions, permission coverage, and append-only access history."
        title="Access overview"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="System and custom roles currently configured."
          icon={ShieldCheck}
          label="Roles"
          value={rolesQuery.data?.totalCount ?? "—"}
        />
        <StatCard
          description="Canonical permission keys available for grants."
          icon={KeyRound}
          label="Permissions"
          value={
            canViewPermissions
              ? (permissionsQuery.data?.totalCount ?? "—")
              : "—"
          }
        />
        <StatCard
          description="Recent role and override history preserved in the audit log."
          icon={ClipboardList}
          label="Audit events"
          value={canViewAudit ? (auditQuery.data?.totalCount ?? "—") : "—"}
        />
        <StatCard
          description="Current access-related capabilities on this signed-in session."
          icon={Users}
          label="My access grants"
          value={accessPermissionCount}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader>
            <CardTitle>Access workspace</CardTitle>
            <CardDescription>
              Each page has a visibility permission, and sensitive actions stay
              on their own permission keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <AccessLinkCard
              description="Review role definitions, granted permission sets, and assignment impact."
              href="/admin/access/roles"
              label="Roles"
            />
            <PermissionGate permission="users.view">
              <AccessLinkCard
                description="Inspect current user role coverage and assigned location scopes."
                href="/admin/access/users"
                label="User access"
              />
            </PermissionGate>
            <PermissionGate permission="access.permissions.view">
              <AccessLinkCard
                description="Inspect page permissions and action permissions across the platform."
                href="/admin/access/permissions"
                label="Permissions"
              />
            </PermissionGate>
            <PermissionGate permission="access.audit.view">
              <AccessLinkCard
                description="Review append-only access changes with actor, target, and reason."
                href="/admin/access/audit"
                label="Audit log"
              />
            </PermissionGate>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader>
            <CardTitle>Permission model</CardTitle>
            <CardDescription>
              Keep route visibility and page actions separate so revocation
              stays precise.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>Use `*.view` keys for page entry and navigation visibility.</p>
            <p>
              Use action keys such as `*.create`, `*.manage`, or `*.assign` for
              buttons, mutations, and dangerous flows inside a page.
            </p>
            <p>
              Keep access changes explainable: every override and revocation
              should leave an audit reason behind.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Recent access changes</CardTitle>
              <CardDescription>
                The latest append-only role and override events.
              </CardDescription>
            </div>
            <PermissionGate permission="access.audit.view">
              <Link
                className={buttonVariants({ size: "sm", variant: "outline" })}
                href={toRoute("/admin/access/audit")}
              >
                Open audit log
              </Link>
            </PermissionGate>
          </div>
        </CardHeader>
        <CardContent>
          {!canViewAudit ? (
            <AppEmptyState
              description="This account can open the access workspace but does not have audit visibility."
              title="Audit access required"
            />
          ) : auditQuery.isPending && !auditQuery.data ? (
            <div className="flex flex-col gap-2">
              {ACCESS_AUDIT_SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-16 w-full" />
              ))}
            </div>
          ) : auditQuery.data?.items.length ? (
            <div className="flex flex-col gap-3">
              {auditQuery.data.items.map((entry) => (
                <div
                  key={getAuditEntryKey(entry)}
                  className="rounded-xl border border-border/70 bg-muted/20 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {entry.action.replaceAll("_", " ")}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {entry.actorName ?? "System"} changed{" "}
                      {entry.targetUserName ?? "a platform subject"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{entry.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.permissionKey ?? entry.roleSlug ?? "Global scope"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <AppEmptyState
              description="No access changes have been recorded yet."
              title="No audit entries"
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
