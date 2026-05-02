"use client";

import type { AdminUpdateBrandRequest } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthorization } from "@/components/providers/authorization-provider";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { CATALOG_STATUS_META, formatAdminDate } from "@/lib/admin-models";
import {
  adminBrandQueryKey,
  deleteAdminBrand,
  fetchAdminBrand,
  updateAdminBrand,
} from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import { readStringParam } from "@/lib/url-state";
import { cn } from "@/lib/utils";
import { CatalogDeleteDialog } from "../catalog-delete-dialog";
import {
  CatalogDetailError,
  CatalogDetailHeaderActions,
  CatalogDetailRow,
  CatalogDetailSkeleton,
  CatalogDetailsCard,
} from "../catalog-detail-surfaces";
import { HistoryPanel } from "../history";
import { MediaPanel } from "../media/media-panel";
import { BrandEditForm } from "./brand-edit-form";

export function BrandDetailPageClient({ slug }: { slug: string }) {
  const { can } = useAuthorization();
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
  const canManage = can("catalog.brands.manage");
  const canManageMedia = can("catalog.media.manage");
  const canViewHistory = can("catalog.history.view");

  useEffect(() => {
    if (!canManage && isEditing) {
      setIsEditing(false);
    }
  }, [canManage, isEditing]);

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
    return <CatalogDetailSkeleton />;
  }

  if (brandQuery.isError) {
    return (
      <CatalogDetailError
        message={
          brandQuery.error instanceof Error
            ? brandQuery.error.message
            : "An unexpected error occurred."
        }
        title="Unable to load brand"
      />
    );
  }

  if (!brandQuery.data) return null;

  const brand = brandQuery.data;
  const statusMeta = CATALOG_STATUS_META[brand.status];

  return (
    <PageShell>
      <PageHeader
        actions={
          <CatalogDetailHeaderActions
            isEditing={isEditing}
            isPending={updateMutation.isPending}
            onCancel={() => setIsEditing(false)}
            onDelete={() => setIsDeleteDialogOpen(true)}
            onEdit={() => setIsEditing(true)}
            permission="catalog.brands.manage"
          />
        }
        backHref={toRoute("/admin/products/brands")}
        backLabel="Brands"
        description="Manage brand identity, availability, and media."
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
        <CatalogDetailsCard title="Brand details">
          <CatalogDetailRow label="Name" value={brand.name} />
          <CatalogDetailRow label="Slug" tone="identifier" value={brand.slug} />
          {brand.website ? (
            <CatalogDetailRow
              label="Website"
              tone="support"
              value={brand.website}
            />
          ) : null}
          {brand.description ? (
            <CatalogDetailRow
              className="sm:col-span-2"
              label="Description"
              tone="support"
              value={brand.description}
            />
          ) : null}
        </CatalogDetailsCard>
      )}

      <MediaPanel
        canManage={canManageMedia}
        entitySlug={brand.slug}
        entityType="brand"
      />

      {canViewHistory ? (
        <HistoryPanel entityKind="brand" slug={brand.slug} />
      ) : null}

      <CatalogDeleteDialog
        entityName={brand.name}
        entitySlug={brand.slug}
        entityType="brand"
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={async (nextSlug: string) => {
          await deleteAdminBrand(nextSlug);
          router.push(toRoute("/admin/products/brands"));
        }}
        onSuccessQueryKeys={[["admin", "catalog", "brands"]]}
      />
    </PageShell>
  );
}
