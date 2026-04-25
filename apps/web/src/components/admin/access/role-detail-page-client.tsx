"use client";

import type { AdminPermissionSummary, AdminRoleDetail } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, ShieldCheck, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import {
  AccessActionBadge,
  AccessTextCell,
} from "@/components/admin/access/access-table-cells";
import { CatalogFormCard } from "@/components/admin/catalog/catalog-form-surfaces";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppErrorBanner } from "@/components/system/app-error";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminRoleDetailQueryKey,
  fetchAdminPermissions,
  fetchAdminRole,
} from "@/lib/react-query/admin-access";
import { toRoute } from "@/lib/routes";
import {
  getRoleErrorMessage,
  rolePermissionColumns,
} from "./role-detail-page-support";
import { RoleEditorForm } from "./role-editor-form";

export function RoleDetailPageClient({ slug }: { slug: string }) {
  const { can } = useAuthorization();
  const roleQuery = useQuery({
    queryFn: () => fetchAdminRole(slug),
    queryKey: adminRoleDetailQueryKey(slug),
  });
  const canManage = can("access.roles.manage");
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
        <AppErrorBanner
          detail={getRoleErrorMessage(roleQuery.error)}
          error={roleQuery.error}
          onRetry={() => {
            void roleQuery.refetch();
          }}
          title="Unable to load role"
        />
      ) : roleQuery.data ? (
        <RoleDetailBody
          permissionOptions={permissionOptionsQuery.data?.items ?? []}
          role={roleQuery.data}
        />
      ) : null}
    </PageShell>
  );
}

function RoleDetailBody({
  permissionOptions,
  role,
}: {
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
          <PermissionGate permission="access.roles.manage">
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={toRoute("/admin/access/roles/new")}
            >
              Create related role
            </Link>
          </PermissionGate>
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

      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-none">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {role.isSystem ? "System role" : "Custom role"}
          </Badge>
          <AccessActionBadge>{role.slug}</AccessActionBadge>
          <AccessTextCell
            value={`${grantedPermissions.length} granted permissions across ${role.assignedUserCount} active assignments.`}
          />
        </div>
      </div>

      <Tabs defaultValue="coverage">
        <TabsList>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <PermissionGate permission="access.roles.manage">
            <TabsTrigger value="editor">Editor</TabsTrigger>
          </PermissionGate>
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
        <PermissionGate permission="access.roles.manage">
          <TabsContent className="pt-3" value="editor">
            <CatalogFormCard
              description="Adjust page visibility and action grants for this role. Role changes remain auditable and deterministic."
              title="Edit role"
            >
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
            </CatalogFormCard>
          </TabsContent>
        </PermissionGate>
      </Tabs>
    </>
  );
}
