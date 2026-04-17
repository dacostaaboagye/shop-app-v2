"use client";

import type { AdminPermissionSummary, AdminRoleDetail } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, ShieldCheck, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { AppDataTable } from "@/components/data-table/app-data-table";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminRoleDetailQueryKey,
  fetchAdminPermissions,
  fetchAdminRole,
} from "@/lib/react-query/admin-access";
import {
  currentUserPermissionsQueryKey,
  fetchCurrentUserPermissions,
} from "@/lib/react-query/auth";
import { toRoute } from "@/lib/routes";
import {
  getRoleErrorMessage,
  rolePermissionColumns,
} from "./role-detail-page-support";
import { RoleEditorForm } from "./role-editor-form";

export function RoleDetailPageClient({ slug }: { slug: string }) {
  const roleQuery = useQuery({
    queryFn: () => fetchAdminRole(slug),
    queryKey: adminRoleDetailQueryKey(slug),
  });
  const currentPermissionsQuery = useQuery({
    queryFn: fetchCurrentUserPermissions,
    queryKey: currentUserPermissionsQueryKey,
  });
  const canManage =
    currentPermissionsQuery.data?.permissions.includes("access.roles.manage") ??
    false;
  const permissionOptionsQuery = useQuery({
    enabled: canManage,
    queryFn: () => fetchAdminPermissions({ page: 1, pageSize: 100, q: "" }),
    queryKey: ["admin", "access", "role-editor-permissions"],
  });

  return (
    <PageShell>
      {roleQuery.isPending && !roleQuery.data ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : roleQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load role</AlertTitle>
          <AlertDescription>
            {getRoleErrorMessage(roleQuery.error)}
          </AlertDescription>
        </Alert>
      ) : roleQuery.data ? (
        <RoleDetailBody
          canManage={canManage}
          permissionOptions={permissionOptionsQuery.data?.items ?? []}
          role={roleQuery.data}
        />
      ) : null}
    </PageShell>
  );
}

function RoleDetailBody({
  canManage,
  permissionOptions,
  role,
}: {
  canManage: boolean;
  permissionOptions: readonly AdminPermissionSummary[];
  role: AdminRoleDetail;
}) {
  const grantedPermissions = role.permissions.filter(
    (permission) => permission.granted,
  );

  return (
    <>
      <PageHeader
        actions={
          canManage ? (
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={toRoute("/admin/access/roles/new")}
            >
              Create related role
            </Link>
          ) : undefined
        }
        backHref={toRoute("/admin/access/roles")}
        description={role.description}
        title={role.name}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Current granted permissions on this role."
          icon={KeyRound}
          label="Granted permissions"
          value={grantedPermissions.length}
        />
        <StatCard
          description="Active users currently assigned to this role."
          icon={Users}
          label="Assigned users"
          value={role.assignedUserCount}
        />
        <StatCard
          description="Total permission catalogue rows reviewed against this role."
          icon={ShieldCheck}
          label="Coverage rows"
          value={role.permissions.length}
        />
        <StatCard
          description="Whether this role is seeded or custom."
          icon={UserCheck}
          label="Scope"
          value={role.isSystem ? "System" : "Custom"}
        />
      </div>

      <Card className="border-border/70 bg-card shadow-none">
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Badge variant="outline">
            {role.isSystem ? "System role" : "Custom role"}
          </Badge>
          <Badge variant="secondary">{role.slug}</Badge>
          <span className="text-sm text-muted-foreground">
            {grantedPermissions.length} granted permissions across{" "}
            {role.assignedUserCount} active assignments.
          </span>
        </CardContent>
      </Card>

      <Tabs defaultValue="coverage">
        <TabsList variant="line">
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          {canManage ? <TabsTrigger value="editor">Editor</TabsTrigger> : null}
        </TabsList>
        <TabsContent className="pt-3" value="coverage">
          <AppDataTable
            columns={rolePermissionColumns}
            data={role.permissions}
            density="compact"
            emptyDescription="No permission rows were returned for this role."
            emptyTitle="No permissions"
            getRowId={(row) => row.key}
          />
        </TabsContent>
        {canManage ? (
          <TabsContent className="pt-3" value="editor">
            <Card className="border-border/70 bg-card shadow-none">
              <CardHeader>
                <CardTitle>Edit role</CardTitle>
                <CardDescription>
                  Adjust page visibility and action grants for this role. The
                  backend keeps role changes auditable and deterministic.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoleEditorForm
                  initialValues={{
                    description: role.description,
                    name: role.name,
                    permissionKeys: grantedPermissions.map(
                      (permission) => permission.key,
                    ),
                  }}
                  isSystem={role.isSystem}
                  mode="edit"
                  permissionOptions={permissionOptions}
                  roleSlug={role.slug}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </>
  );
}
