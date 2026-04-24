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
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  if (locationScopes.length === 0) {
    return (
      <Empty className="rounded-xl border border-dashed border-border bg-white p-10 shadow-sm">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapPinned className="size-8 text-muted-foreground/40" />
          </EmptyMedia>
          <EmptyTitle className="text-sm font-bold uppercase tracking-wider">
            {title}
          </EmptyTitle>
          <EmptyDescription className="text-xs">
            {emptyDescription}
          </EmptyDescription>
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
      <Card className="rounded-xl border border-border bg-white shadow-sm overflow-hidden py-0">
        <CardHeader className="p-5">
          <CardTitle className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="size-4.5" />
            </div>
            {scope.locationName}
          </CardTitle>
          <CardDescription className="text-[11px] font-medium text-muted-foreground/70 mt-1.5 pl-[48px] leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border bg-white shadow-sm overflow-hidden py-0">
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider">
          {title}
        </CardTitle>
        <CardDescription className="text-[11px] font-medium text-muted-foreground/70">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor={selectId}
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
          >
            {label}
          </Label>
          <Select value={selectedLocationSlug} onValueChange={onLocationChange}>
            <SelectTrigger
              id={selectId}
              className="h-11 w-full rounded-xl border-border/60 bg-muted/20 transition-all focus:bg-background focus:ring-primary/20"
            >
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
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
