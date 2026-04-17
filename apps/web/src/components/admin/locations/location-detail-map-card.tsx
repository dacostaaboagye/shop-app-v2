"use client";

import type { AdminLocationSummary } from "@shop/contracts";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LocationMiniMap = dynamic(
  () =>
    import("./location-map-picker").then((mod) => ({
      default: mod.LocationMapPicker,
    })),
  { ssr: false },
);

export function LocationDetailMapCard({
  address,
  latitude,
  longitude,
}: Pick<AdminLocationSummary, "address" | "latitude" | "longitude">) {
  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <CardTitle>Map</CardTitle>
        <CardDescription>Pin location on the map.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="pointer-events-none opacity-80">
          <LocationMiniMap
            onChange={() => {}}
            value={{ address, latitude, longitude }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
