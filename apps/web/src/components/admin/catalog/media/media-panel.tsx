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

type Props = {
  canManage: boolean;
  entitySlug: string;
  entityType: CatalogMediaEntityType;
};

export function MediaPanel({ canManage, entitySlug, entityType }: Props) {
  const queryClient = useQueryClient();
  const qKey = adminMediaQueryKey(entityType, entitySlug);

  const mediaQuery = useQuery({
    queryFn: () => fetchAdminMedia(entityType, entitySlug),
    queryKey: qKey,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminMedia(id),
    onError: () => toast.error("Failed to delete media."),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qKey });
      toast.success("Media deleted");
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) =>
      setAdminMediaPrimary(id, { entitySlug, entityType }),
    onError: () => toast.error("Failed to update primary image."),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qKey });
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
          onSuccess={() =>
            void queryClient.invalidateQueries({ queryKey: qKey })
          }
        />
      </CardContent>
    </Card>
  );
}
