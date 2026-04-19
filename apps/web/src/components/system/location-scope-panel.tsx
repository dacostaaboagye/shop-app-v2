"use client";

import type { AuthLocationPermissionScope } from "@shop/contracts";
import { MapPin, MapPinned } from "lucide-react";
import { useId } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type LocationScopePanelProps = {
  description: string;
  emptyDescription: string;
  locationScopes: readonly AuthLocationPermissionScope[];
  selectedLocationSlug: string;
  title: string;
  onLocationChange: (locationSlug: string) => void;
  isLoading?: boolean;
  label?: string;
};

export function LocationScopePanel({
  description,
  emptyDescription,
  isLoading = false,
  label = "Location",
  locationScopes,
  onLocationChange,
  selectedLocationSlug,
  title,
}: LocationScopePanelProps) {
  const selectId = useId();

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (locationScopes.length === 0) {
    return (
      <Empty className="rounded-md border border-dashed border-border bg-card p-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapPinned />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (locationScopes.length === 1) {
    const scope = locationScopes[0];

    if (!scope) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4" />
            {scope.locationName}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={selectId}>{label}</Label>
          <Select
            id={selectId}
            onChange={(event) => onLocationChange(event.target.value)}
            value={selectedLocationSlug}
          >
            {locationScopes.map((scope) => (
              <option key={scope.locationId} value={scope.locationSlug}>
                {scope.locationName}
              </option>
            ))}
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
