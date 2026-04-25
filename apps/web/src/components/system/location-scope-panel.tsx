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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type LocationScopePanelProps = {
  allOptionLabel?: string;
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
  allOptionLabel,
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
  const allOptionValue = "__all_locations__";

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  if (locationScopes.length === 0) {
    return (
      <Empty className="rounded-xl border border-dashed border-border bg-card p-10 shadow-sm">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapPinned className="size-8 text-muted-foreground/40" />
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
      <Card className="overflow-hidden rounded-xl border border-border bg-card py-0 shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="flex min-w-0 items-center gap-3 text-base">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="size-4.5" />
            </div>
            <span className="min-w-0 text-balance">{scope.locationName}</span>
          </CardTitle>
          <CardDescription className="mt-1.5 pl-[48px] leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-xl border border-border bg-card py-0 shadow-sm">
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="flex flex-col gap-2">
          <Label htmlFor={selectId}>{label}</Label>
          <Select
            value={selectedLocationSlug || allOptionValue}
            onValueChange={(value) =>
              onLocationChange(value === allOptionValue ? "" : value)
            }
          >
            <SelectTrigger
              id={selectId}
              className="h-11 w-full rounded-xl border-border/60 bg-muted/20 transition-all focus:bg-background focus:ring-primary/20"
            >
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {allOptionLabel ? (
                <SelectItem value={allOptionValue}>{allOptionLabel}</SelectItem>
              ) : null}
              {locationScopes.map((scope) => (
                <SelectItem key={scope.locationId} value={scope.locationSlug}>
                  {scope.locationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
