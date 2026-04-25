"use client";

import { Building2 } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
    <AppFormField
      inputId={id}
      label="Fulfilment enabled"
      {...(typeof description === "string" ? { description } : {})}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 transition-colors",
          checked && "border-primary/30 bg-primary/5",
          disabled && "opacity-60",
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium leading-tight text-foreground">
            <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
            <span>Enable fulfilment routing</span>
          </div>
          {typeof description !== "string" ? (
            <div className="form-field-description mt-1">{description}</div>
          ) : null}
        </div>
        <Switch
          checked={checked}
          disabled={disabled}
          id={id}
          onCheckedChange={onChange}
        />
      </div>
    </AppFormField>
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
