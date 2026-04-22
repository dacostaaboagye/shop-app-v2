import type { AdminLocationSummary } from "@shop/contracts";
import { Building2, Store, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LOCATION_STATUS_META, LOCATION_TYPE_META } from "@/lib/admin-models";
import { cn } from "@/lib/utils";
import { LocationDetailRow } from "./location-detail-row";

export function LocationDetailSummaryCard({
  location,
}: {
  location: AdminLocationSummary;
}) {
  const statusMeta = LOCATION_STATUS_META[location.status];
  const typeMeta = LOCATION_TYPE_META[location.type];
  const TypeIcon = location.type === "store" ? Store : Warehouse;

  return (
    <Card className="h-full border-border/70 bg-card shadow-none">
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
                <span className="text-sm text-muted-foreground">Disabled</span>
              )
            }
          />
          <LocationDetailRow
            label="Slug"
            value={<span className="font-mono text-sm">{location.slug}</span>}
          />
          <LocationDetailRow
            label="Manager"
            value={
              location.managerName ?? (
                <span className="text-muted-foreground">Unassigned</span>
              )
            }
          />
          {location.address ? (
            <LocationDetailRow
              label="Address"
              value={<span className="text-sm">{location.address}</span>}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
