"use client";

import type { AdminReservationSummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { useId, useState } from "react";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminLocationsQueryKey,
  fetchAdminLocations,
} from "@/lib/react-query/admin-directory";
import {
  adminReservationsQueryKey,
  fetchAdminReservations,
} from "@/lib/react-query/stock-admin";

const LOCATIONS_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "all" as const,
  type: "all" as const,
};

const columns: ColumnDef<AdminReservationSummary>[] = [
  {
    id: "product",
    enableSorting: false,
    header: "Product / Variant",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-medium leading-none">{row.original.productName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {row.original.variantName}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "sku",
    enableSorting: false,
    header: "SKU",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Reserved",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="tabular-nums font-medium">{getValue() as number}</span>
    ),
  },
  {
    accessorKey: "sourceType",
    enableSorting: false,
    header: "Source",
    cell: ({ getValue }) => (
      <Badge variant="outline">{getValue() as string}</Badge>
    ),
  },
  {
    accessorKey: "sourceKey",
    enableSorting: false,
    header: "Source key",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: "expiresAt",
    enableSorting: false,
    header: "Expires",
    cell: ({ getValue }) => {
      const val = getValue() as string | null;
      return val ? (
        <span className="tabular-nums text-sm">
          {new Date(val).toLocaleString()}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
];

type Filter = { locationSlug: string; q: string };
const SKELETON_KEYS = ["r-1", "r-2", "r-3", "r-4", "r-5"] as const;

export default function ActiveReservationsPage() {
  const locationSelectId = useId();
  const searchId = useId();

  const [locationSlug, setLocationSlug] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter | null>(null);

  const locationsQuery = useQuery({
    queryFn: () => fetchAdminLocations(LOCATIONS_QUERY),
    queryKey: adminLocationsQueryKey(LOCATIONS_QUERY),
    staleTime: 60_000,
  });

  const reservationsQuery = useQuery({
    enabled: !!filter,
    queryFn: async () => {
      if (!filter) throw new Error("A location is required.");
      return fetchAdminReservations({
        limit: 50,
        locationSlug: filter.locationSlug,
        q: filter.q,
      });
    },
    queryKey: adminReservationsQueryKey(
      filter
        ? { limit: 50, locationSlug: filter.locationSlug, q: filter.q }
        : {},
    ),
  });

  function handleLocationChange(slug: string) {
    setLocationSlug(slug);
    setFilter(slug ? { locationSlug: slug, q: search.trim() } : null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!locationSlug) return;
    setFilter({ locationSlug, q: search.trim() });
  }

  function handleClear() {
    setLocationSlug("");
    setSearch("");
    setFilter(null);
  }

  return (
    <PageShell>
      <PageHeader
        description="Active stock reservations held against inventory at a location."
        title="Reservations"
      />

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3"
        onSubmit={handleSubmit}
      >
        <div className="flex min-w-52 flex-1 flex-col gap-1.5">
          <Label htmlFor={locationSelectId}>Location</Label>
          <Select
            id={locationSelectId}
            onChange={(e) => handleLocationChange(e.target.value)}
            required
            value={locationSlug}
          >
            <option value="">
              {locationsQuery.isPending
                ? "Loading locations…"
                : "Select a location"}
            </option>
            {locationsQuery.data?.items.map((loc) => (
              <option key={loc.slug} value={loc.slug}>
                {loc.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex min-w-52 flex-1 flex-col gap-1.5">
          <Label htmlFor={searchId}>Search (optional)</Label>
          <Input
            id={searchId}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Product name or SKU"
            value={search}
          />
        </div>
        <div className="flex gap-2">
          <Button disabled={!locationSlug} size="sm" type="submit">
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

      {reservationsQuery.data ? (
        <p className="text-sm tabular-nums text-muted-foreground">
          {reservationsQuery.data.items.length} active reservation
          {reservationsQuery.data.items.length !== 1 ? "s" : ""}
          {reservationsQuery.data.locationName
            ? ` at ${reservationsQuery.data.locationName}`
            : ""}
        </p>
      ) : null}

      {reservationsQuery.isFetching && !reservationsQuery.data ? (
        <div className="flex flex-col gap-2">
          {SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-10 w-full" />
          ))}
        </div>
      ) : reservationsQuery.isError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {reservationsQuery.error instanceof Error
            ? reservationsQuery.error.message
            : "Failed to load reservations."}
        </p>
      ) : (
        <AppDataTable
          columns={columns}
          data={reservationsQuery.data?.items ?? []}
          density="compact"
          emptyDescription={
            filter
              ? "No active reservations found at this location."
              : "Select a location above to load reservations."
          }
          emptyTitle="No reservations"
          getRowId={(row) => `${row.skuId}:${row.sourceKey}`}
        />
      )}
    </PageShell>
  );
}
