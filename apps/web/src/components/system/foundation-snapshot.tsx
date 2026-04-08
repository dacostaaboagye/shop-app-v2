"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { InsightCard } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type TableDensity,
  useInterfacePreferencesStore,
} from "@/store/use-interface-preferences-store";

type FoundationRow = {
  dependency: string;
  focus: string;
  module: string;
  status: "ready" | "watch" | "blocked";
};

const foundationRows: FoundationRow[] = [
  {
    dependency: "Permission resolution service",
    focus: "API boundary and frontend route policy",
    module: "Identity and access control",
    status: "ready",
  },
  {
    dependency: "Ownership ledger tables",
    focus: "Trace stock attribution before reporting",
    module: "Inventory ownership",
    status: "ready",
  },
  {
    dependency: "Reservation lock workflow",
    focus: "Protect concurrent stock mutations",
    module: "Stock balances",
    status: "watch",
  },
  {
    dependency: "Slug and reference issuance",
    focus: "Keep public URLs and references stable",
    module: "Infrastructure",
    status: "blocked",
  },
];

const columns: Array<ColumnDef<FoundationRow, unknown>> = [
  {
    accessorKey: "module",
    header: "Module",
  },
  {
    accessorKey: "dependency",
    header: "Dependency",
  },
  {
    accessorKey: "focus",
    header: "Execution focus",
  },
  {
    accessorKey: "status",
    cell: ({ row }) => (
      <Badge variant={getBadgeVariant(row.original.status)}>
        {getStatusLabel(row.original.status)}
      </Badge>
    ),
    header: "Status",
    meta: {
      align: "right",
    },
  },
];

function getBadgeVariant(status: FoundationRow["status"]) {
  switch (status) {
    case "ready":
      return "default";
    case "watch":
      return "secondary";
    case "blocked":
      return "outline";
  }
}

function getStatusLabel(status: FoundationRow["status"]) {
  switch (status) {
    case "ready":
      return "Ready";
    case "watch":
      return "Watch";
    case "blocked":
      return "Blocked";
  }
}

export function FoundationSnapshot() {
  const tableDensity = useInterfacePreferencesStore(
    (state) => state.tableDensity,
  );
  const setTableDensity = useInterfacePreferencesStore(
    (state) => state.setTableDensity,
  );

  return (
    <InsightCard
      eyebrow="Frontend System"
      title="Shared table patterns and UI state are already anchored"
      description="Tables use TanStack Table through a single wrapper, and client-only UI preferences stay in Zustand instead of leaking into server data models."
    >
      <AppDataTable
        caption="Execution readiness snapshot for the first foundation areas."
        columns={columns}
        data={foundationRows}
        density={tableDensity}
        emptyDescription="No foundation modules have been defined yet."
        emptyTitle="No foundation data"
        toolbar={
          <>
            <DensityButton
              active={tableDensity === "comfortable"}
              density="comfortable"
              onSelect={setTableDensity}
            />
            <DensityButton
              active={tableDensity === "compact"}
              density="compact"
              onSelect={setTableDensity}
            />
          </>
        }
      />
    </InsightCard>
  );
}

type DensityButtonProps = {
  active: boolean;
  density: TableDensity;
  onSelect: (density: TableDensity) => void;
};

function DensityButton({ active, density, onSelect }: DensityButtonProps) {
  return (
    <Button
      onClick={() => onSelect(density)}
      size="sm"
      type="button"
      variant={active ? "default" : "outline"}
    >
      {density === "comfortable" ? "Comfortable density" : "Compact density"}
    </Button>
  );
}
