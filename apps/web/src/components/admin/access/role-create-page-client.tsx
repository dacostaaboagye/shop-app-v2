"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        <Alert variant="destructive">
          <AlertTitle>Unable to load permissions</AlertTitle>
          <AlertDescription>
            {permissionOptionsQuery.error instanceof Error
              ? permissionOptionsQuery.error.message
              : "Failed to load permissions."}
          </AlertDescription>
        </Alert>
      ) : (
        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader>
            <CardTitle>Create role</CardTitle>
            <CardDescription>
              Start with the minimum required permissions and expand only where
              the workflow needs it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RoleEditorForm
              initialValues={{
                description: "",
                name: "",
                permissionKeys: [],
              }}
              mode="create"
              permissionOptions={permissionOptionsQuery.data?.items ?? []}
            />
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
