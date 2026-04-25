import {
  CatalogDetailError,
  CatalogDetailSkeleton,
} from "../catalog-detail-surfaces";

export const CATEGORY_PARENT_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "active" as const,
};

export { CatalogDetailSkeleton as CategoryDetailSkeleton };

export function CategoryDetailError({ message }: { message: string }) {
  return (
    <CatalogDetailError message={message} title="Unable to load category" />
  );
}
