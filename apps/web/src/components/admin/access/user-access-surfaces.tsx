"use client";

import {
  CatalogDetailError,
  CatalogDetailSkeleton,
} from "@/components/admin/catalog/catalog-detail-surfaces";

export function UserAccessDetailSkeleton() {
  return <CatalogDetailSkeleton statCount={4} />;
}

export function UserAccessLoadError({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return <CatalogDetailError message={message} title={title} />;
}
