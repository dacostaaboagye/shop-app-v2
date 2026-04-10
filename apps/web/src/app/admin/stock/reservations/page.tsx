"use client";

import type { ActiveReservationSummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { useId, useState } from "react";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  activeReservationsQueryKey,
  fetchActiveReservations,
} from "@/lib/react-query/stock-admin";

const columns: ColumnDef<ActiveReservationSummary>[] = [
  {
    accessorKey: "skuId",
    enableSorting: false,
    header: "SKU ID",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Qty",
    meta: { align: "right" },
  },
  {
    accessorKey: "sourceType",
    header: "Source type",
    cell: ({ getValue }) => (
      <Badge variant="outline">{getValue() as string}</Badge>
    ),
  },
  {
    accessorKey: "sourceKey",
    enableSorting: false,
    header: "Source key",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: "status",
    enableSorting: false,
    header: "Status",
    cell: () => <Badge>active</Badge>,
  },
  {
    accessorKey: "expiresAt",
    header: "Expires at",
    cell: ({ getValue }) => {
      const val = getValue() as string | null;
      return val ? (
        <span className="tabular-nums text-sm">
          {new Date(val).toLocaleString()}
        </span>
      ) : (
        <span className="text-muted-foreground">&mdash;</span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created at",
    cell: ({ getValue }) => (
      <span className="tabular-nums text-sm">
        {new Date(getValue() as string).toLocaleString()}
      </span>
    ),
  },
];

type Filter = { locationId: string; skuId?: string };
const RESERVATION_SKELETON_KEYS = [
  "reservation-row-1",
  "reservation-row-2",
  "reservation-row-3",
  "reservation-row-4",
  "reservation-row-5",
] as const;

export default function ActiveReservationsPage() {
  const locationInputId = useId();
  const skuInputId = useId();

  const [locationId, setLocationId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [filter, setFilter] = useState<Filter | null>(null);

  const query = useQuery({
    enabled: !!filter,
    queryFn: async () => {
      if (!filter) {
        throw new Error("A location ID is required to load reservations.");
      }

      return fetchActiveReservations({
        limit: 50,
        locationId: filter.locationId,
        ...(filter.skuId ? { skuId: filter.skuId } : {}),
      });
    },
    queryKey: activeReservationsQueryKey({
      locationId: filter?.locationId ?? "",
      ...(filter?.skuId ? { skuId: filter.skuId } : {}),
    }),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!locationId.trim()) return;
    setFilter({
      locationId: locationId.trim(),
      ...(skuId.trim() ? { skuId: skuId.trim() } : {}),
    });
  }

  function handleClear() {
    setLocationId("");
    setSkuId("");
    setFilter(null);
  }

  return (
    <PageShell className="gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Active reservations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Requires{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-medium">
              inventory.read
            </code>
          </p>
        </div>
        {query.data ? (
          <span className="text-sm text-muted-foreground">
            {query.data.items.length} reservation
            {query.data.items.length !== 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3"
        onSubmit={handleSubmit}
      >
        <div className="flex min-w-60 flex-1 flex-col gap-1.5">
          <Label htmlFor={locationInputId}>Location ID</Label>
          <Input
            id={locationInputId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
            value={locationId}
          />
        </div>

        <div className="flex min-w-52 flex-1 flex-col gap-1.5">
          <Label htmlFor={skuInputId}>SKU ID (optional)</Label>
          <Input
            id={skuInputId}
            onChange={(e) => setSkuId(e.target.value)}
            placeholder="Filter by SKU"
            value={skuId}
          />
        </div>

        <div className="flex gap-2">
          <Button size="sm" type="submit">
            <Search className="size-3.5" />
            Query
          </Button>
          {filter ? (
            <Button
              onClick={handleClear}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      </form>

      {query.isFetching && !query.data ? (
        <div className="flex flex-col gap-2">
          {RESERVATION_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-10 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load reservations."}
        </p>
      ) : (
        <AppDataTable
          columns={columns}
          data={query.data?.items ?? []}
          density="compact"
          emptyDescription={
            filter
              ? "No active reservations found at this location."
              : "Enter a location ID and click Query to load data."
          }
          emptyTitle="No reservations"
          getRowId={(row) => `${row.skuId}:${row.sourceKey}`}
        />
      )}
    </PageShell>
  );
}
