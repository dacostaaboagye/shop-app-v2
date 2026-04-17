"use client";

import type { AdminLocationZoneSummary } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Plus } from "lucide-react";
import { useState } from "react";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAdminDate } from "@/lib/admin-models";
import {
  adminLocationZonesQueryKey,
  deleteAdminLocationZone,
  fetchAdminLocationZones,
} from "@/lib/react-query/admin-location-zones";
import { toast } from "@/lib/toast";
import { LocationZoneForm } from "./location-zone-form";

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
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (zonesQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load zones</AlertTitle>
        <AlertDescription>
          {zonesQuery.error instanceof Error
            ? zonesQuery.error.message
            : "An unexpected error occurred."}
        </AlertDescription>
      </Alert>
    );
  }

  const zones = zonesQuery.data?.items ?? [];

  return (
    <>
      <Card className="border-border/70 bg-card shadow-none">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Storage Zones</CardTitle>
            <CardDescription>
              Configure aisles, shelves, or specific areas within this location.
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} size="sm" type="button">
            <Plus data-icon="inline-start" />
            Add zone
          </Button>
        </CardHeader>
        <CardContent>
          <AppDataTable
            density="compact"
            columns={[
              {
                id: "name",
                header: () => "Name",
                cell: (ctx) => (
                  <div className="font-medium">{ctx.row.original.name}</div>
                ),
              },
              {
                id: "description",
                header: () => "Description",
                cell: (ctx) => (
                  <div className="text-muted-foreground truncate max-w-[300px]">
                    {ctx.row.original.description || "—"}
                  </div>
                ),
              },
              {
                id: "createdAt",
                header: () => "Created",
                cell: (ctx) => (
                  <div className="tabular-nums text-muted-foreground">
                    {formatAdminDate(ctx.row.original.createdAt)}
                  </div>
                ),
              },
              {
                id: "actions",
                header: () => <span className="sr-only">Actions</span>,
                cell: (ctx) => (
                  <div className="flex justify-end relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingZone(ctx.row.original);
                      }}
                      title="Delete zone"
                    >
                      <Archive className="size-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
            data={zones}
            getRowId={(row) => row.slug}
            onRowClick={(row) => setEditingZone(row)}
            emptyTitle="No zones configured"
            emptyDescription="Add a zone to start tracking stock across specific areas."
            emptyState={{ kind: "no-data" }}
          />
        </CardContent>
      </Card>

      <LocationZoneForm
        locationSlug={locationSlug}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false);
          void queryClient.invalidateQueries({
            queryKey: adminLocationZonesQueryKey(locationSlug),
          });
          toast.success("Zone created");
        }}
      />

      <LocationZoneForm
        locationSlug={locationSlug}
        zone={editingZone}
        open={!!editingZone}
        onOpenChange={(open: boolean) => !open && setEditingZone(null)}
        onSuccess={() => {
          setEditingZone(null);
          void queryClient.invalidateQueries({
            queryKey: adminLocationZonesQueryKey(locationSlug),
          });
          toast.success("Zone saved");
        }}
      />

      <Dialog
        open={!!deletingZone}
        onOpenChange={(open: boolean) => !open && setDeletingZone(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete zone?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the zone{" "}
              <strong>{deletingZone?.name}</strong>? This action cannot be
              undone. Zones containing active stock assignments cannot be
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingZone(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                if (deletingZone) {
                  deleteMutation.mutate(deletingZone.slug);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
