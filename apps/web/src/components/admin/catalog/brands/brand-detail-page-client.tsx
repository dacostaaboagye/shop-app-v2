"use client";

import type { AdminUpdateBrandRequest } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Pencil, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CATALOG_STATUS_META, formatAdminDate } from "@/lib/admin-models";
import {
  adminBrandQueryKey,
  deleteAdminBrand,
  fetchAdminBrand,
  updateAdminBrand,
} from "@/lib/react-query/admin-catalog";
import {
  currentUserPermissionsQueryKey,
  fetchCurrentUserPermissions,
} from "@/lib/react-query/auth";
import { toRoute } from "@/lib/routes";
import { readStringParam } from "@/lib/url-state";
import { cn } from "@/lib/utils";
import { CatalogDeleteDialog } from "../catalog-delete-dialog";
import { MediaPanel } from "../media/media-panel";
import { BrandEditForm } from "./brand-edit-form";

export function BrandDetailPageClient({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(
    readStringParam(searchParams, "edit") === "true",
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const brandQuery = useQuery({
    queryFn: () => fetchAdminBrand(slug),
    queryKey: adminBrandQueryKey(slug),
  });
  const permissionsQuery = useQuery({
    queryFn: fetchCurrentUserPermissions,
    queryKey: currentUserPermissionsQueryKey,
  });

  const updateMutation = useMutation({
    mutationFn: (input: AdminUpdateBrandRequest) =>
      updateAdminBrand(slug, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(adminBrandQueryKey(slug), updated);
      void queryClient.invalidateQueries({
        exact: false,
        queryKey: ["admin", "catalog", "brands"],
      });
      setIsEditing(false);
      toast.success("Brand saved");
    },
  });

  if (brandQuery.isPending && !brandQuery.data) {
    return (
      <PageShell>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </PageShell>
    );
  }

  if (brandQuery.isError) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertTitle>Unable to load brand</AlertTitle>
          <AlertDescription>
            {brandQuery.error instanceof Error
              ? brandQuery.error.message
              : "An unexpected error occurred."}
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  if (!brandQuery.data) return null;

  const brand = brandQuery.data;
  const statusMeta = CATALOG_STATUS_META[brand.status];
  const canManageMedia =
    permissionsQuery.data?.permissions.includes("catalog.media.manage") ??
    false;

  return (
    <PageShell>
      <PageHeader
        actions={
          !isEditing ? (
            <div className="flex gap-2">
              {permissionsQuery.data?.permissions.includes(
                "catalog.brands.manage",
              ) && (
                <Button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  size="sm"
                  type="button"
                  variant="outline-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              )}
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsEditing(false)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X className="size-3.5" />
              Cancel
            </Button>
          )
        }
        backHref={toRoute("/admin/products/brands")}
        backLabel="Brands"
        description={`/${brand.slug}`}
        image={brand.primaryImageUrl ?? null}
        title={brand.name}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          description="Date this brand was registered."
          icon={CalendarDays}
          label="Created"
          value={formatAdminDate(brand.createdAt)}
        />
        <StatCard
          description="Current visibility in product assignments."
          icon={CalendarDays}
          label="Status"
          value={
            <Badge
              className={cn("w-fit", statusMeta.className)}
              variant="outline"
            >
              {statusMeta.label}
            </Badge>
          }
        />
      </div>

      {isEditing ? (
        <BrandEditForm
          brand={brand}
          error={updateMutation.isError ? updateMutation.error : null}
          isPending={updateMutation.isPending}
          onCancel={() => setIsEditing(false)}
          onSubmit={(values) => updateMutation.mutate(values)}
        />
      ) : (
        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader>
            <CardTitle>Brand details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Name
              </p>
              <p>{brand.name}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Slug
              </p>
              <p className="font-mono">{brand.slug}</p>
            </div>
            {brand.website ? (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Website
                </p>
                <p>{brand.website}</p>
              </div>
            ) : null}
            {brand.description ? (
              <div className="col-span-2 flex flex-col gap-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <p className="text-muted-foreground">{brand.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <MediaPanel
        canManage={canManageMedia}
        entitySlug={brand.slug}
        entityType="brand"
      />

      <CatalogDeleteDialog
        entityName={brand.name}
        entitySlug={brand.slug}
        entityType="brand"
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={async (slug: string) => {
          await deleteAdminBrand(slug);
          router.push(toRoute("/admin/products/brands"));
        }}
        onSuccessQueryKeys={[["admin", "catalog", "brands"]]}
      />
    </PageShell>
  );
}
