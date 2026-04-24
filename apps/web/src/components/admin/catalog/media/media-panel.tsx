"use client";

import type { CatalogMediaEntityType } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  adminMediaQueryKey,
  deleteAdminMedia,
  fetchAdminMedia,
  setAdminMediaPrimary,
} from "@/lib/react-query/admin-catalog-media";
import { toast } from "@/lib/toast";
import { MediaGallery } from "./media-gallery";
import { MediaUploader } from "./media-uploader";

function getEntityDetailKey(
  entityType: CatalogMediaEntityType,
  slug: string,
): unknown[][] {
  switch (entityType) {
    case "brand":
      return [["admin", "catalog", "brands", slug]];
    case "category":
      return [["admin", "catalog", "categories", slug]];
    case "product":
      return [["admin", "catalog", "products", slug]];
    case "location":
      return [["admin", "locations", slug]];
    case "system":
      return [
        ["official-documents", "profile"],
        ["official-documents", "settings"],
      ];
    case "user":
      return [["admin", "access", "users", slug]];
    default:
      return [];
  }
}

type Props = {
  canManage: boolean;
  entitySlug: string;
  entityType: CatalogMediaEntityType;
};

export function MediaPanel({ canManage, entitySlug, entityType }: Props) {
  const queryClient = useQueryClient();
  const qKey = adminMediaQueryKey(entityType, entitySlug);
  const detailKeys = getEntityDetailKey(entityType, entitySlug);

  function invalidateDetail() {
    detailKeys.forEach((queryKey) => {
      void queryClient.invalidateQueries({ queryKey });
    });
  }

  const mediaQuery = useQuery({
    queryFn: () => fetchAdminMedia(entityType, entitySlug),
    queryKey: qKey,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminMedia(id),
    onError: () => toast.error("Failed to delete media."),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qKey });
      invalidateDetail();
      toast.success("Media deleted");
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) =>
      setAdminMediaPrimary(id, { entitySlug, entityType }),
    onError: () => toast.error("Failed to update primary image."),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qKey });
      invalidateDetail();
      toast.success("Primary image updated");
    },
  });

  const items = mediaQuery.data?.items ?? [];

  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <CardTitle>Media</CardTitle>
        <CardDescription>
          Images and videos associated with this entity.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <MediaGallery
          canManage={canManage}
          isPendingDelete={deleteMutation.isPending}
          isPendingSetPrimary={setPrimaryMutation.isPending}
          items={items}
          onDelete={(id) => deleteMutation.mutate(id)}
          onSetPrimary={(id) => setPrimaryMutation.mutate(id)}
        />
        <MediaUploader
          canManage={canManage}
          entitySlug={entitySlug}
          entityType={entityType}
          nextPosition={items.length}
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: qKey });
            invalidateDetail();
          }}
        />
      </CardContent>
    </Card>
  );
}
