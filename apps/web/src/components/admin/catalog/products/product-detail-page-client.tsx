"use client";

import type { AdminUpdateProductRequest } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Layers } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATALOG_STATUS_META, formatAdminDate } from "@/lib/admin-models";
import {
  adminBrandsQueryKey,
  adminCategoriesQueryKey,
  deleteAdminProduct,
  fetchAdminBrands,
  fetchAdminCategories,
} from "@/lib/react-query/admin-catalog";
import {
  adminProductQueryKey,
  fetchAdminProduct,
  updateAdminProduct,
} from "@/lib/react-query/admin-catalog-products";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CatalogDeleteDialog } from "../catalog-delete-dialog";
import { MediaPanel } from "../media/media-panel";
import { DetailRow } from "./detail-row";
import {
  PRODUCT_DETAIL_QUERY,
  ProductDetailSkeleton,
  ProductHeaderActions,
  toProductEditValues,
  toProductUpdateRequest,
} from "./product-detail-page.support";
import { ProductEditForm, type ProductEditValues } from "./product-edit-form";
import { ProductOptionsPanel } from "./product-options-panel";
import { VariantsPanel } from "./variants-panel";
export function ProductDetailPageClient({ slug }: { slug: string }) {
  const { can } = useAuthorization();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const canManage = can("catalog.products.manage");
  const canSeeCostPrice = can("catalog.cost_price.view");
  const canManageMedia = can("catalog.media.manage");

  useEffect(() => {
    if (searchParams.get("edit") === "true" && canManage) {
      setIsEditing(true);
    }
  }, [canManage, searchParams]);

  useEffect(() => {
    if (!canManage && isEditing) {
      setIsEditing(false);
    }
  }, [canManage, isEditing]);

  const productQuery = useQuery({
    queryFn: () => fetchAdminProduct(slug),
    queryKey: adminProductQueryKey(slug),
  });
  const brandsQuery = useQuery({
    queryFn: () => fetchAdminBrands(PRODUCT_DETAIL_QUERY),
    queryKey: adminBrandsQueryKey(PRODUCT_DETAIL_QUERY),
  });
  const categoriesQuery = useQuery({
    queryFn: () => fetchAdminCategories(PRODUCT_DETAIL_QUERY),
    queryKey: adminCategoriesQueryKey(PRODUCT_DETAIL_QUERY),
  });

  const updateMutation = useMutation({
    mutationFn: (input: AdminUpdateProductRequest) =>
      updateAdminProduct(slug, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(adminProductQueryKey(slug), updated);
      void queryClient.invalidateQueries({
        exact: false,
        queryKey: ["admin", "catalog", "products"],
      });
      setIsEditing(false);
      toast.success("Product saved");
    },
  });

  if (productQuery.isPending && !productQuery.data) {
    return <ProductDetailSkeleton />;
  }

  if (productQuery.isError) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertTitle>Unable to load product</AlertTitle>
          <AlertDescription>
            {productQuery.error instanceof Error
              ? productQuery.error.message
              : "An unexpected error occurred."}
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  if (!productQuery.data) return null;
  const product = productQuery.data;
  const statusMeta = CATALOG_STATUS_META[product.status];
  const brands = brandsQuery.data?.items ?? [];
  const categories = categoriesQuery.data?.items ?? [];
  return (
    <PageShell>
      <PageHeader
        actions={
          <ProductHeaderActions
            isEditing={isEditing}
            isPending={updateMutation.isPending}
            onCancel={() => setIsEditing(false)}
            onDelete={() => setIsDeleteDialogOpen(true)}
            onEdit={() => setIsEditing(true)}
          />
        }
        backHref={toRoute("/admin/products")}
        backLabel="Products"
        description={`/${product.slug}`}
        image={product.primaryImageUrl ?? null}
        title={product.name}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Date this product was created."
          icon={CalendarDays}
          label="Created"
          value={formatAdminDate(product.createdAt)}
        />
        <StatCard
          description="Number of variants configured."
          icon={Layers}
          label="Variants"
          value={product.variantCount}
        />
        <StatCard
          description="Current catalogue visibility."
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
        <StatCard
          description="Brand association."
          icon={CalendarDays}
          label="Brand"
          value={product.brandSlug ?? "—"}
        />
      </div>
      {isEditing ? (
        <ProductEditForm
          brands={brands}
          categories={categories}
          defaultValues={toProductEditValues(product)}
          error={updateMutation.isError ? updateMutation.error : null}
          isPending={updateMutation.isPending}
          onCancel={() => setIsEditing(false)}
          onSubmit={(values: ProductEditValues) =>
            updateMutation.mutate(toProductUpdateRequest(values))
          }
        />
      ) : (
        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader>
            <CardTitle>Product details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <DetailRow label="Name" value={product.name} />
            <DetailRow label="Brand" value={product.brandSlug ?? "—"} />
            <DetailRow label="Category" value={product.categorySlug ?? "—"} />
            {product.description ? (
              <DetailRow label="Description" value={product.description} />
            ) : null}
          </CardContent>
        </Card>
      )}
      <ProductOptionsPanel
        canManage={canManage}
        options={product.options}
        productSlug={product.slug}
      />
      <VariantsPanel
        canManage={canManage}
        canSeeCostPrice={canSeeCostPrice}
        options={product.options}
        productSlug={product.slug}
        variants={product.variants}
      />
      <MediaPanel
        canManage={canManageMedia}
        entitySlug={product.slug}
        entityType="product"
      />
      <CatalogDeleteDialog
        entityName={product.name}
        entitySlug={product.slug}
        entityType="product"
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={async (slug: string) => {
          await deleteAdminProduct(slug);
          router.push(toRoute("/admin/products"));
        }}
        onSuccessQueryKeys={[
          ["admin", "catalog", "products"],
          ["admin", "catalog", "counts"],
        ]}
      />
    </PageShell>
  );
}
