import type {
  AdminProductDetail,
  AdminUpdateProductRequest,
} from "@shop/contracts";
import {
  CatalogDetailHeaderActions,
  CatalogDetailSkeleton,
} from "../catalog-detail-surfaces";
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
  isEditing: boolean;
  isPending: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onEdit: () => void;
};

export function ProductHeaderActions({
  isEditing,
  isPending,
  onCancel,
  onDelete,
  onEdit,
}: ProductHeaderActionsProps) {
  return (
    <CatalogDetailHeaderActions
      isEditing={isEditing}
      isPending={isPending}
      onCancel={onCancel}
      onDelete={onDelete}
      onEdit={onEdit}
      permission="catalog.products.manage"
    />
  );
}

export { CatalogDetailSkeleton as ProductDetailSkeleton };

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
