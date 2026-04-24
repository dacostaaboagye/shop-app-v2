"use client";

import type { AdminUpdateCategoryRequest } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Pencil, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthorization } from "@/components/providers/authorization-provider";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATALOG_STATUS_META, formatAdminDate } from "@/lib/admin-models";
import {
  adminCategoriesQueryKey,
  adminCategoryQueryKey,
  deleteAdminCategory,
  fetchAdminCategories,
  fetchAdminCategory,
  updateAdminCategory,
} from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import { readStringParam } from "@/lib/url-state";
import { cn } from "@/lib/utils";
import { CatalogDeleteDialog } from "../catalog-delete-dialog";
import { MediaPanel } from "../media/media-panel";
import {
  CATEGORY_PARENT_QUERY,
  CategoryDetailError,
  CategoryDetailSkeleton,
} from "./category-detail-page.support";
import { CategoryEditForm } from "./category-edit-form";

export function CategoryDetailPageClient({ slug }: { slug: string }) {
  const { can } = useAuthorization();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(
    readStringParam(searchParams, "edit") === "true",
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const categoryQuery = useQuery({
    queryFn: () => fetchAdminCategory(slug),
    queryKey: adminCategoryQueryKey(slug),
  });
  const parentCategoriesQuery = useQuery({
    queryFn: () => fetchAdminCategories(CATEGORY_PARENT_QUERY),
    queryKey: adminCategoriesQueryKey(CATEGORY_PARENT_QUERY),
  });
  const canManage = can("catalog.categories.manage");
  const canManageMedia = can("catalog.media.manage");

  useEffect(() => {
    if (!canManage && isEditing) {
      setIsEditing(false);
    }
  }, [canManage, isEditing]);

  const updateMutation = useMutation({
    mutationFn: (input: AdminUpdateCategoryRequest) =>
      updateAdminCategory(slug, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(adminCategoryQueryKey(slug), updated);
      void queryClient.invalidateQueries({
        exact: false,
        queryKey: ["admin", "catalog", "categories"],
      });
      setIsEditing(false);
      toast.success("Category saved");
    },
  });

  if (categoryQuery.isPending && !categoryQuery.data) {
    return <CategoryDetailSkeleton />;
  }

  if (categoryQuery.isError) {
    return (
      <CategoryDetailError
        message={
          categoryQuery.error instanceof Error
            ? categoryQuery.error.message
            : "An unexpected error occurred."
        }
      />
    );
  }

  if (!categoryQuery.data) return null;

  const category = categoryQuery.data;
  const statusMeta = CATALOG_STATUS_META[category.status];
  const parentOptions = (parentCategoriesQuery.data?.items ?? []).filter(
    (c) => c.slug !== slug,
  );

  return (
    <PageShell>
      <PageHeader
        actions={
          !isEditing ? (
            <div className="flex gap-2">
              <PermissionGate permission="catalog.categories.manage">
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              </PermissionGate>
              <PermissionGate permission="catalog.categories.manage">
                <Button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  size="sm"
                  type="button"
                  variant="outline-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </PermissionGate>
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
        backHref={toRoute("/admin/products/categories")}
        backLabel="Categories"
        description={`/${category.slug}`}
        image={category.primaryImageUrl ?? null}
        title={category.name}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          description="Date this category was created."
          icon={CalendarDays}
          label="Created"
          value={formatAdminDate(category.createdAt)}
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
        <CategoryEditForm
          category={category}
          error={updateMutation.isError ? updateMutation.error : null}
          isPending={updateMutation.isPending}
          onCancel={() => setIsEditing(false)}
          onSubmit={(values) => updateMutation.mutate(values)}
          parentOptions={parentOptions}
        />
      ) : (
        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader>
            <CardTitle>Category details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Name
              </p>
              <p>{category.name}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Slug
              </p>
              <p className="font-mono">{category.slug}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Parent
              </p>
              <p className="font-mono">
                {category.parentCategorySlug ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
            {category.description ? (
              <div className="col-span-2 flex flex-col gap-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <p className="text-muted-foreground">{category.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <MediaPanel
        canManage={canManageMedia}
        entitySlug={category.slug}
        entityType="category"
      />

      <CatalogDeleteDialog
        entityName={category.name}
        entitySlug={category.slug}
        entityType="category"
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={async (slug: string) => {
          await deleteAdminCategory(slug);
          router.push(toRoute("/admin/products/categories"));
        }}
        onSuccessQueryKeys={[["admin", "catalog", "categories"]]}
      />
    </PageShell>
  );
}
