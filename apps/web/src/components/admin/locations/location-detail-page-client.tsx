"use client";

import type { AdminUpdateLocationRequest } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { PageShell } from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminLocationQueryKey,
  fetchAdminLocation,
  updateAdminLocation,
} from "@/lib/react-query/admin-location-write";
import { toast } from "@/lib/toast";
import { LocationDetailView } from "./location-detail-view";

const LOCATION_DETAIL_SKELETON_KEYS = [
  "location-detail-stat-1",
  "location-detail-stat-2",
  "location-detail-stat-3",
  "location-detail-stat-4",
] as const;

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
    return (
      <PageShell>
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {LOCATION_DETAIL_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </PageShell>
    );
  }

  if (locationQuery.isError) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertTitle>Unable to load location</AlertTitle>
          <AlertDescription>
            {locationQuery.error instanceof Error
              ? locationQuery.error.message
              : "An unexpected error occurred."}
          </AlertDescription>
        </Alert>
      </PageShell>
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
