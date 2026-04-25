"use client";

import type { AdminLocationZoneSummary } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { MouseEvent } from "react";
import { useState } from "react";
import { StockWorkspaceTableSkeleton } from "@/components/stock/stock-workspace-feedback";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCount } from "@/lib/display/format";
import {
  adminLocationZonesQueryKey,
  deleteAdminLocationZone,
  fetchAdminLocationZones,
} from "@/lib/react-query/admin-location-zones";
import { toast } from "@/lib/toast";
import { LocationZoneForm } from "./location-zone-form";
import {
  DeleteZoneDialog,
  LocationZonesTable,
} from "./location-zones-panel.support";

export function LocationZonesPanel({ locationSlug }: { locationSlug: string }) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingZone, setEditingZone] =
    useState<AdminLocationZoneSummary | null>(null);
  const [deletingZone, setDeletingZone] =
    useState<AdminLocationZoneSummary | null>(null);

  const zonesQuery = useQuery({
    queryFn: () => fetchAdminLocationZones(locationSlug),
    queryKey: adminLocationZonesQueryKey(locationSlug),
  });

  const deleteMutation = useMutation({
    mutationFn: (zoneSlug: string) =>
      deleteAdminLocationZone(locationSlug, zoneSlug),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminLocationZonesQueryKey(locationSlug),
      });
      toast.success("Zone deleted");
      setDeletingZone(null);
    },
  });

  if (zonesQuery.isPending && !zonesQuery.data) {
    return (
      <Card className="border-border/70 bg-card shadow-none">
        <CardHeader>
          <CardTitle>Storage zones</CardTitle>
          <CardDescription>
            Configure aisles, shelves, and handling areas within this location.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StockWorkspaceTableSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (zonesQuery.isError) {
    return (
      <Card className="border-border/70 bg-card shadow-none">
        <CardHeader>
          <CardTitle>Storage zones</CardTitle>
          <CardDescription>
            Configure aisles, shelves, and handling areas within this location.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppErrorBanner
            detail={
              zonesQuery.error instanceof Error
                ? zonesQuery.error.message
                : "An unexpected error occurred."
            }
            error={zonesQuery.error}
            onRetry={() => void zonesQuery.refetch()}
            title="Unable to load zones"
          />
        </CardContent>
      </Card>
    );
  }

  const zones = zonesQuery.data?.items ?? [];

  return (
    <>
      <Card className="border-border/70 bg-card shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Storage zones</CardTitle>
            <CardDescription>
              Configure aisles, shelves, and handling areas within this
              location.
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} size="sm" type="button">
            <Plus data-icon="inline-start" />
            Add zone
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="type-support type-inline-metric text-muted-foreground">
              {formatCount(zones.length)} zone{zones.length === 1 ? "" : "s"}{" "}
              configured
            </p>
          </div>
          <LocationZonesTable
            onDelete={(zone, event) => {
              event.stopPropagation();
              setDeletingZone(zone);
            }}
            onEdit={(zone) => setEditingZone(zone)}
            zones={zones}
          />
        </CardContent>
      </Card>

      <LocationZoneForm
        locationSlug={locationSlug}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false);
          void queryClient.invalidateQueries({
            queryKey: adminLocationZonesQueryKey(locationSlug),
          });
          toast.success("Zone created");
        }}
        open={isCreateOpen}
      />

      <LocationZoneForm
        locationSlug={locationSlug}
        onOpenChange={(open: boolean) => !open && setEditingZone(null)}
        onSuccess={() => {
          setEditingZone(null);
          void queryClient.invalidateQueries({
            queryKey: adminLocationZonesQueryKey(locationSlug),
          });
          toast.success("Zone saved");
        }}
        open={!!editingZone}
        zone={editingZone}
      />

      <DeleteZoneDialog
        deletingZone={deletingZone}
        isPending={deleteMutation.isPending}
        onConfirm={(event: MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          if (deletingZone) {
            deleteMutation.mutate(deletingZone.slug);
          }
        }}
        onOpenChange={(open: boolean) => !open && setDeletingZone(null)}
      />
    </>
  );
}
