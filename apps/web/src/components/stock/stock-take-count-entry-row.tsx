"use client";

import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StockTakeLine } from "@/lib/react-query/stock-takes";
import type { LineCountSaveStatus } from "@/lib/react-query/use-stock-take-line-counts";

type CountEntryRowProps = {
  isLocked: boolean;
  line: StockTakeLine;
  onCommit: (entry: {
    countedQuantity: number | null;
    lineNumber: number;
    note: string | null;
  }) => void;
  status: LineCountSaveStatus;
};

export function CountEntryRow({
  isLocked,
  line,
  onCommit,
  status,
}: CountEntryRowProps) {
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

function parseQuantity(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 0) return "invalid";
  return parsed;
}
