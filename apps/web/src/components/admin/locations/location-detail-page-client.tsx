"use client";

import type { AdminUpdateLocationRequest } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import {
  adminLocationQueryKey,
  fetchAdminLocation,
  updateAdminLocation,
} from "@/lib/react-query/admin-location-write";
import { toast } from "@/lib/toast";
import {
  CatalogDetailError,
  CatalogDetailSkeleton,
} from "../catalog/catalog-detail-surfaces";
import { LocationDetailView } from "./location-detail-view";

export function LocationDetailPageClient({ slug }: { slug: string }) {
  const { can } = useAuthorization();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const locationQuery = useQuery({
    queryFn: () => fetchAdminLocation(slug),
    queryKey: adminLocationQueryKey(slug),
  });
  const canManageMedia = can("catalog.media.manage");
  const updateMutation = useMutation({
    mutationFn: (input: AdminUpdateLocationRequest) =>
      updateAdminLocation(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminLocationQueryKey(slug),
      });
      void queryClient.invalidateQueries({
        exact: false,
        queryKey: ["admin", "locations"],
      });
      setIsEditing(false);
      toast.success("Location saved");
    },
  });

  if (locationQuery.isPending && !locationQuery.data) {
    return <CatalogDetailSkeleton statCount={4} />;
  }

  if (locationQuery.isError) {
    return (
      <CatalogDetailError
        message={
          locationQuery.error instanceof Error
            ? locationQuery.error.message
            : "An unexpected error occurred."
        }
        title="Unable to load location"
      />
    );
  }

  if (!locationQuery.data) {
    return null;
  }

  return (
    <LocationDetailView
      canManageMedia={canManageMedia}
      error={updateMutation.isError ? updateMutation.error : null}
      isEditing={isEditing}
      isPending={updateMutation.isPending}
      location={locationQuery.data}
      onCancelEdit={() => setIsEditing(false)}
      onStartEdit={() => {
        if (!can("locations.create")) {
          return;
        }

        setIsEditing(true);
      }}
      onSubmit={(values) => updateMutation.mutate(values)}
    />
  );
}
