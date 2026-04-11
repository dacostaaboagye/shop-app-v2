"use client";

import type { AdminUpdateProductRequest } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Layers, Pencil, X } from "lucide-react";
import { useState } from "react";
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
  adminBrandsQueryKey,
  adminCategoriesQueryKey,
  fetchAdminBrands,
  fetchAdminCategories,
} from "@/lib/react-query/admin-catalog";
import {
  adminProductQueryKey,
  fetchAdminProduct,
  updateAdminProduct,
} from "@/lib/react-query/admin-catalog-products";
import {
  currentUserPermissionsQueryKey,
  fetchCurrentUserPermissions,
} from "@/lib/react-query/auth";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { MediaPanel } from "../media/media-panel";
import { DetailRow } from "./detail-row";
import { ProductEditForm, type ProductEditValues } from "./product-edit-form";
import { ProductOptionsPanel } from "./product-options-panel";
import { VariantsPanel } from "./variants-panel";

const ALL_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "active" as const,
};
export function ProductDetailPageClient({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const productQuery = useQuery({
    queryFn: () => fetchAdminProduct(slug),
    queryKey: adminProductQueryKey(slug),
  });
  const permissionsQuery = useQuery({
    queryFn: fetchCurrentUserPermissions,
    queryKey: currentUserPermissionsQueryKey,
  });
  const brandsQuery = useQuery({
    queryFn: () => fetchAdminBrands(ALL_QUERY),
    queryKey: adminBrandsQueryKey(ALL_QUERY),
  });
  const categoriesQuery = useQuery({
    queryFn: () => fetchAdminCategories(ALL_QUERY),
    queryKey: adminCategoriesQueryKey(ALL_QUERY),
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
    return (
      <PageShell>
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["s1", "s2", "s3", "s4"].map((k) => (
            <Skeleton key={k} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </PageShell>
    );
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
  const perms = permissionsQuery.data?.permissions ?? [];
  const canManage = perms.includes("catalog.products.manage");
  const canSeeCostPrice = perms.includes("catalog.cost_price.view");
  const canManageMedia = perms.includes("catalog.media.manage");
  const brands = brandsQuery.data?.items ?? []; const categories = categoriesQuery.data?.items ?? [];
  return (
    <PageShell>
      <PageHeader
        actions={
          !isEditing ? (
            <Button
              disabled={!canManage}
              onClick={() => setIsEditing(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
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
        backHref={toRoute("/admin/products")}
        backLabel="Products"
        description={`/${product.slug}`}
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
          defaultValues={{
            brandSlug: product.brandSlug ?? "",
            categorySlug: product.categorySlug ?? "",
            countryOfOrigin: product.countryOfOrigin ?? "",
            description: product.description ?? "",
            features: product.features ?? [],
            name: product.name,
            status: product.status,
          }}
          error={updateMutation.isError ? updateMutation.error : null}
          isPending={updateMutation.isPending}
          onCancel={() => setIsEditing(false)}
          onSubmit={(values: ProductEditValues) =>
            updateMutation.mutate({
              brandSlug: values.brandSlug || null,
              categorySlug: values.categorySlug || null,
              countryOfOrigin: values.countryOfOrigin || null,
              description: values.description.trim() || null,
              features: values.features,
              name: values.name.trim(),
              status: values.status,
            })
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
    </PageShell>
  );
}
