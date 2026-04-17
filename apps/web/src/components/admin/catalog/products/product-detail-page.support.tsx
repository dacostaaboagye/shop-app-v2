import type {
  AdminProductDetail,
  AdminUpdateProductRequest,
} from "@shop/contracts";
import { Pencil, Trash2, X } from "lucide-react";
import { PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductEditValues } from "./product-edit-form";

export const PRODUCT_DETAIL_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "active" as const,
};

type ProductHeaderActionsProps = {
  canManage: boolean;
  isEditing: boolean;
  isPending: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onEdit: () => void;
};

export function ProductHeaderActions({
  canManage,
  isEditing,
  isPending,
  onCancel,
  onDelete,
  onEdit,
}: ProductHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {!isEditing ? (
        <>
          <Button
            disabled={!canManage || isPending}
            onClick={onEdit}
            size="sm"
            type="button"
            variant="outline"
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            disabled={!canManage || isPending}
            onClick={onDelete}
            size="sm"
            type="button"
            variant="outline-destructive"
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </>
      ) : (
        <Button onClick={onCancel} size="sm" type="button" variant="ghost">
          <X className="size-3.5" />
          Cancel
        </Button>
      )}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <PageShell>
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["s1", "s2", "s3", "s4"].map((key) => (
          <Skeleton key={key} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </PageShell>
  );
}

export function toProductEditValues(
  product: AdminProductDetail,
): ProductEditValues {
  return {
    brandSlug: product.brandSlug ?? "",
    categorySlug: product.categorySlug ?? "",
    countryOfOrigin: product.countryOfOrigin ?? "",
    description: product.description ?? "",
    features: product.features ?? [],
    name: product.name,
    status: product.status,
  };
}

export function toProductUpdateRequest(
  values: ProductEditValues,
): AdminUpdateProductRequest {
  return {
    brandSlug: values.brandSlug || null,
    categorySlug: values.categorySlug || null,
    countryOfOrigin: values.countryOfOrigin || null,
    description: values.description.trim() || null,
    features: values.features,
    name: values.name.trim(),
    status: values.status,
  };
}
