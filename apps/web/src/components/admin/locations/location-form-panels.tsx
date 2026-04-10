"use client";

import { Building2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const LocationMapPicker = dynamic(
  () =>
    import("./location-map-picker").then((mod) => ({
      default: mod.LocationMapPicker,
    })),
  { ssr: false },
);

export function LocationFulfilmentField({
  checked,
  description,
  disabled = false,
  id,
  onChange,
}: {
  checked: boolean;
  description: ReactNode;
  disabled?: boolean;
  id: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 transition-colors",
          "has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5",
        )}
      >
        <input
          checked={checked}
          className="mt-0.5 size-4 accent-primary"
          disabled={disabled}
          id={id}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium leading-tight">
            <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
            Fulfilment enabled
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </label>
    </div>
  );
}

export function LocationMapCard({
  address,
  description,
  latitude,
  longitude,
  onChange,
}: {
  address: string;
  description: ReactNode;
  latitude: number | undefined;
  longitude: number | undefined;
  onChange: (value: {
    address: string;
    latitude: number | undefined;
    longitude: number | undefined;
  }) => void;
}) {
  return (
    <Card className="border-border/60 bg-muted/10 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Location on map</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <LocationMapPicker
          onChange={(mapValue) => {
            if (mapValue) {
              onChange(mapValue);
              return;
            }

            onChange({
              address: "",
              latitude: undefined,
              longitude: undefined,
            });
          }}
          value={{ address, latitude, longitude }}
        />
      </CardContent>
    </Card>
  );
}

export function LocationFormActions({
  canSubmit,
  cancelLabel = "Cancel",
  isBusy,
  onCancel,
  submitLabel,
  submittingLabel,
}: {
  canSubmit: boolean;
  cancelLabel?: string;
  isBusy: boolean;
  onCancel: () => void;
  submitLabel: string;
  submittingLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4">
      <Button
        disabled={isBusy}
        onClick={onCancel}
        type="button"
        variant="outline"
      >
        {cancelLabel}
      </Button>
      <Button disabled={!canSubmit || isBusy} type="submit">
        {isBusy ? (
          <>
            <Spinner data-icon="inline-start" />
            {submittingLabel}
          </>
        ) : (
          <>
            {submitLabel}
            <Save data-icon="inline-end" />
          </>
        )}
      </Button>
    </div>
  );
}
