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
  Users,
  X,
} from "lucide-react";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAdminDate, LOCATION_TYPE_META } from "@/lib/admin-models";
import { toRoute } from "@/lib/routes";
import { MediaPanel } from "../catalog/media/media-panel";
import { LocationDetailMapCard } from "./location-detail-map-card";
import { LocationDetailSummaryCard } from "./location-detail-summary-card";
import { LocationEditForm } from "./location-edit-form";
import { getAdminStaffLocationHref } from "./location-staff-links";
import { LocationStaffPanel } from "./location-staff-panel";
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
  const typeMeta = LOCATION_TYPE_META[location.type];
  const hasCoordinates =
    location.latitude != null && location.longitude != null;
  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/locations")}
        backLabel="Locations"
        description="Manage staff coverage, storage zones, fulfilment routing, and mapped site details."
        eyebrow={typeMeta.label}
        image={location.primaryImageUrl ?? null}
        title={location.name}
        actions={
          !isEditing ? (
            <PermissionGate permission="locations.create">
              <Button
                onClick={onStartEdit}
                size="sm"
                type="button"
                variant="outline"
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
            </PermissionGate>
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
          href={getAdminStaffLocationHref(location.slug)}
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
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="details">Details & Map</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="zones">Storage Zones</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
          </TabsList>

          <TabsContent className="mt-0 flex flex-col gap-6" value="details">
            <div className="grid gap-6 xl:grid-cols-[1fr_0.6fr]">
              <LocationDetailSummaryCard location={location} />

              {hasCoordinates ? (
                <LocationDetailMapCard
                  address={location.address}
                  latitude={location.latitude}
                  longitude={location.longitude}
                />
              ) : null}
            </div>
          </TabsContent>

          <TabsContent className="mt-0" value="staff">
            <LocationStaffPanel locationSlug={location.slug} />
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
