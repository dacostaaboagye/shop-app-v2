"use client";

import { Building2, MapPin } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SupplyRequestTarget } from "./supply-request-dialog.types";

export function TargetSummary({ target }: { target: SupplyRequestTarget }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-white px-3 py-3 shadow-sm">
      <div>
        <p className="font-medium">{target.productName}</p>
        <p className="type-support">{target.variantName}</p>
        <p className="type-identifier mt-1">{target.sku}</p>
      </div>
      <div className="flex items-start gap-2 rounded-lg bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">
            Destination location
          </span>
          <span>{target.locationName}</span>
        </div>
      </div>
    </div>
  );
}

export function SourceLocationField({
  onValueChange,
  sourceId,
  sourceLocationId,
  sourceLocations,
  sourceLocationsQuery,
  target,
}: {
  onValueChange: (value: string) => void;
  sourceId: string;
  sourceLocationId: string;
  sourceLocations: Array<{
    locationId: string;
    locationName: string;
  }>;
  sourceLocationsQuery: {
    error: Error | null;
    isError: boolean;
    isPending: boolean;
    refetch: () => Promise<unknown>;
  };
  target: SupplyRequestTarget;
}) {
  const selectedLocationName =
    sourceLocations.find((location) => location.locationId === sourceLocationId)
      ?.locationName ?? null;

  return (
    <AppFormField
      description={`Only source locations eligible to send stock into ${target.locationName} are shown.`}
      inputId={sourceId}
      label="Request from"
    >
      {sourceLocationsQuery.isError ? (
        <AppErrorBanner
          detail="Eligible source locations could not be loaded."
          error={sourceLocationsQuery.error}
          onRetry={() => void sourceLocationsQuery.refetch()}
          title="Unable to load source locations"
        />
      ) : sourceLocations.length === 0 && !sourceLocationsQuery.isPending ? (
        <AppEmptyState
          description="No other active locations are currently available as transfer sources for this destination."
          icon={Building2}
          kind="no-data"
          title="No source locations"
        />
      ) : (
        <Select value={sourceLocationId} onValueChange={onValueChange}>
          <SelectTrigger
            id={sourceId}
            disabled={sourceLocationsQuery.isPending}
            className="w-full"
          >
            <SelectValue
              placeholder={
                sourceLocationsQuery.isPending
                  ? "Loading..."
                  : "Select a source location"
              }
            >
              {selectedLocationName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sourceLocations.map((location) => (
              <SelectItem key={location.locationId} value={location.locationId}>
                {location.locationName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </AppFormField>
  );
}
