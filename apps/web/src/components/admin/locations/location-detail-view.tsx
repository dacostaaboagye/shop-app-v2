"use client";

import type {
  AdminLocationSummary,
  AdminUpdateLocationRequest,
} from "@shop/contracts";
import {
  Building2,
  CalendarDays,
  MapPin,
  Pencil,
  Store,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatAdminDate,
  LOCATION_STATUS_META,
  LOCATION_TYPE_META,
} from "@/lib/admin-models";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { MediaPanel } from "../catalog/media/media-panel";
import { LocationDetailMapCard } from "./location-detail-map-card";
import { LocationDetailRow } from "./location-detail-row";
import { LocationEditForm } from "./location-edit-form";
import { LocationZonesPanel } from "./location-zones-panel";

export function LocationDetailView({
  canManageMedia,
  error,
  isEditing,
  isPending,
  location,
  onCancelEdit,
  onStartEdit,
  onSubmit,
}: {
  canManageMedia: boolean;
  error: unknown;
  isEditing: boolean;
  isPending: boolean;
  location: AdminLocationSummary;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onSubmit: (values: AdminUpdateLocationRequest) => void;
}) {
  const statusMeta = LOCATION_STATUS_META[location.status];
  const typeMeta = LOCATION_TYPE_META[location.type];
  const TypeIcon = location.type === "store" ? Store : Warehouse;
  const hasCoordinates =
    location.latitude != null && location.longitude != null;

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/locations")}
        backLabel="Locations"
        description={`/${location.slug}`}
        eyebrow={typeMeta.label}
        title={location.name}
        actions={
          !isEditing ? (
            <Button
              onClick={onStartEdit}
              size="sm"
              type="button"
              variant="outline"
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ) : (
            <Button
              onClick={onCancelEdit}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X className="size-3.5" />
              Cancel
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Workers and managers at this location."
          icon={Users}
          label="Staff"
          value={location.staffCount}
        />
        <StatCard
          description="Configured storage zones at this location."
          icon={MapPin}
          label="Zones"
          value={location.zoneCount}
        />
        <StatCard
          description="Assigned location manager."
          icon={Building2}
          label="Manager"
          value={location.managerName ?? "Unassigned"}
        />
        <StatCard
          description="Date this location was registered."
          icon={CalendarDays}
          label="Created"
          value={formatAdminDate(location.createdAt)}
        />
      </div>

      {isEditing ? (
        <LocationEditForm
          error={error}
          isPending={isPending}
          location={location}
          onCancel={onCancelEdit}
          onSubmit={onSubmit}
        />
      ) : (
        <Tabs className="flex flex-col gap-6" defaultValue="details">
          <TabsList className="w-fit">
            <TabsTrigger value="details">Details & Map</TabsTrigger>
            <TabsTrigger value="zones">Storage Zones</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
          </TabsList>

          <TabsContent className="mt-0 flex flex-col gap-6" value="details">
            <Card className="border-border/70 bg-card shadow-none">
              <CardHeader>
                <CardTitle>Location details</CardTitle>
                <CardDescription>
                  Configuration and operational status for this location.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <LocationDetailRow label="Name" value={location.name} />
                  <LocationDetailRow
                    label="Type"
                    value={
                      <Badge
                        className={cn("w-fit gap-1.5", typeMeta.className)}
                        variant="outline"
                      >
                        <TypeIcon className="size-3" />
                        {typeMeta.label}
                      </Badge>
                    }
                  />
                  <LocationDetailRow
                    label="Status"
                    value={
                      <Badge
                        className={cn("w-fit", statusMeta.className)}
                        variant="outline"
                      >
                        {statusMeta.label}
                      </Badge>
                    }
                  />
                  <LocationDetailRow
                    label="Fulfilment"
                    value={
                      location.isFulfilmentEnabled ? (
                        <Badge className="w-fit gap-1.5" variant="secondary">
                          <Building2 className="size-3" />
                          Enabled
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Disabled
                        </span>
                      )
                    }
                  />
                  <LocationDetailRow
                    label="Slug"
                    value={
                      <span className="font-mono text-sm">{location.slug}</span>
                    }
                  />
                  <LocationDetailRow
                    label="Manager"
                    value={
                      location.managerName ?? (
                        <span className="text-muted-foreground">
                          Unassigned
                        </span>
                      )
                    }
                  />
                  {location.address ? (
                    <LocationDetailRow
                      label="Address"
                      value={
                        <span className="text-sm">{location.address}</span>
                      }
                    />
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {hasCoordinates ? (
              <LocationDetailMapCard
                address={location.address}
                latitude={location.latitude}
                longitude={location.longitude}
              />
            ) : null}
          </TabsContent>

          <TabsContent className="mt-0" value="zones">
            <LocationZonesPanel locationSlug={location.slug} />
          </TabsContent>
          <TabsContent className="mt-0" value="media">
            <MediaPanel
              canManage={canManageMedia}
              entitySlug={location.slug}
              entityType="location"
            />
          </TabsContent>
        </Tabs>
      )}
    </PageShell>
  );
}
