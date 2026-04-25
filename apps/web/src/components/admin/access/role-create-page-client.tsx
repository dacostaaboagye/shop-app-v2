"use client";

import { useQuery } from "@tanstack/react-query";
import { CatalogFormCard } from "@/components/admin/catalog/catalog-form-surfaces";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAdminPermissions } from "@/lib/react-query/admin-access";
import { toRoute } from "@/lib/routes";
import { RoleEditorForm } from "./role-editor-form";

export function RoleCreatePageClient() {
  const permissionOptionsQuery = useQuery({
    queryFn: () => fetchAdminPermissions({ page: 1, pageSize: 100, q: "" }),
    queryKey: ["admin", "access", "role-create-permissions"],
  });

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/access/roles")}
        description="Create a custom role by combining page visibility and action-specific permissions."
        title="New role"
      />

      {permissionOptionsQuery.isPending && !permissionOptionsQuery.data ? (
        <Skeleton className="h-96 w-full" />
      ) : permissionOptionsQuery.isError ? (
        <AppErrorBanner
          detail={
            permissionOptionsQuery.error instanceof Error
              ? permissionOptionsQuery.error.message
              : "Failed to load permissions."
          }
          error={permissionOptionsQuery.error}
          onRetry={() => {
            void permissionOptionsQuery.refetch();
          }}
          title="Unable to load permissions"
        />
      ) : (
        <CatalogFormCard
          description="Start with the minimum required permissions and expand only where the workflow needs it."
          title="Create role"
        >
          <RoleEditorForm
            initialValues={{
              description: "",
              name: "",
              permissionKeys: [],
            }}
            mode="create"
            permissionOptions={permissionOptionsQuery.data?.items ?? []}
          />
        </CatalogFormCard>
      )}
    </PageShell>
  );
}
