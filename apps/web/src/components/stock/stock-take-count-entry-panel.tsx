"use client";

import { CheckCircle2, CircleAlert, Loader2, Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  StockTakeDetailResponse,
  StockTakeLine,
  StockTakePortal,
} from "@/lib/react-query/stock-takes";
import {
  type LineCountSaveStatus,
  useUpdateStockTakeLineCounts,
} from "@/lib/react-query/use-stock-take-line-counts";

type StockTakeCountEntryPanelProps = {
  detail: StockTakeDetailResponse;
  portal: StockTakePortal;
};

export function StockTakeCountEntryPanel({
  detail,
  portal,
}: StockTakeCountEntryPanelProps) {
  const [search, setSearch] = useState("");
  const searchId = useId();
  const isLocked = detail.status === "applied" || detail.status === "cancelled";
  const lineCounts = useUpdateStockTakeLineCounts({
    portal,
    reference: detail.stockTakeReference,
  });
  const filtered = useMemo(
    () => filterLines(detail.lines, search),
    [detail.lines, search],
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Enter counts in app</CardTitle>
          <CardDescription>
            Save counted quantities and notes line by line. Each row saves on
            blur. Review counts when every line is ready.
          </CardDescription>
        </div>
        <div className="flex flex-col gap-1 md:w-72">
          <label
            className="type-support text-muted-foreground"
            htmlFor={searchId}
          >
            Search this session
          </label>
          <div className="relative flex items-center">
            <Search
              aria-hidden="true"
              className="absolute left-3 size-4 text-muted-foreground"
            />
            <Input
              className="pl-9"
              disabled={isLocked}
              id={searchId}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Product, variant, or SKU"
              type="search"
              value={search}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {detail.lines.length === 0 ? (
          <AppEmptyState
            description="Generate or import a sheet to populate this stock-take session before entering counts."
            title="No lines to count yet"
          />
        ) : filtered.length === 0 ? (
          <AppEmptyState
            description="No session lines match this search. Adjust the search to find a different product, variant, or SKU."
            title="No matching lines"
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((line) => (
              <CountEntryRow
                isLocked={isLocked}
                key={line.lineNumber}
                line={line}
                onCommit={(entry) => lineCounts.queueEntry(entry)}
                status={
                  lineCounts.lineStatuses.get(line.lineNumber) ?? IDLE_STATUS
                }
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const IDLE_STATUS: LineCountSaveStatus = { error: null, state: "idle" };

function CountEntryRow({
  isLocked,
  line,
  onCommit,
  status,
}: {
  isLocked: boolean;
  line: StockTakeLine;
  onCommit: (entry: {
    countedQuantity: number | null;
    lineNumber: number;
    note: string | null;
  }) => void;
  status: LineCountSaveStatus;
}) {
  const initialQuantity = line.countedQuantity?.toString() ?? "";
  const initialNote = line.note ?? "";
  const [quantity, setQuantity] = useState(initialQuantity);
  const [note, setNote] = useState(initialNote);
  const quantityId = useId();
  const noteId = useId();

  function commitIfChanged() {
    if (isLocked) return;
    if (quantity === initialQuantity && note === initialNote) return;
    const parsedQuantity = parseQuantity(quantity);
    if (parsedQuantity === "invalid") return;
    onCommit({
      countedQuantity: parsedQuantity,
      lineNumber: line.lineNumber,
      note: note.trim().length === 0 ? null : note.slice(0, 500),
    });
  }

  return (
    <li className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="type-support text-muted-foreground">
            Line {line.lineNumber} · {line.unitOfMeasure}
          </p>
          <p className="font-semibold text-foreground">
            {line.productName} · {line.variantName}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{line.sku}</p>
        </div>
        <CountEntryStatusBadge status={status} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-1">
          <label
            className="type-support text-muted-foreground"
            htmlFor={quantityId}
          >
            Counted quantity
          </label>
          <Input
            disabled={isLocked}
            id={quantityId}
            inputMode="numeric"
            min={0}
            onBlur={commitIfChanged}
            onChange={(event) => setQuantity(event.currentTarget.value)}
            placeholder="0"
            type="number"
            value={quantity}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            className="type-support text-muted-foreground"
            htmlFor={noteId}
          >
            Note
          </label>
          <Textarea
            disabled={isLocked}
            id={noteId}
            maxLength={500}
            onBlur={commitIfChanged}
            onChange={(event) => setNote(event.currentTarget.value)}
            placeholder="Optional context for the count"
            value={note}
          />
        </div>
      </div>
    </li>
  );
}

function CountEntryStatusBadge({ status }: { status: LineCountSaveStatus }) {
  if (status.state === "pending") {
    return (
      <span className="inline-flex items-center gap-1 type-support text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-3 animate-spin" /> Saving
      </span>
    );
  }
  if (status.state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 type-support text-muted-foreground">
        <CheckCircle2 aria-hidden="true" className="size-3" /> Saved
      </span>
    );
  }
  if (status.state === "error") {
    return (
      <span className="inline-flex items-center gap-1 type-support text-destructive">
        <CircleAlert aria-hidden="true" className="size-3" /> Couldn{"’"}t save
        — retry
      </span>
    );
  }
  return null;
}

function filterLines(lines: StockTakeLine[], search: string): StockTakeLine[] {
  const trimmed = search.trim().toLowerCase();
  if (trimmed.length === 0) return lines;
  return lines.filter((line) => {
    const haystack = [line.productName, line.variantName, line.sku]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toLowerCase())
      .join(" ");
    return haystack.includes(trimmed);
  });
}

function parseQuantity(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 0) return "invalid";
  return parsed;
}
