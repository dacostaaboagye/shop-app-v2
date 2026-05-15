"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getLineDisplayName,
  type getManualStockTakeLines,
} from "./stock-take-catalog-intake.support";

export function ManualLinePicker({
  lines,
  onSelect,
  selectedLineNumber,
}: {
  lines: ReturnType<typeof getManualStockTakeLines>;
  onSelect: (lineNumber: number) => void;
  selectedLineNumber: number | null;
}) {
  return (
    <Card className="h-fit border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle>Manual rows</CardTitle>
        <CardDescription>
          Select a counted blank row and complete catalog defaults.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {lines.map((line) => {
          const selected = line.lineNumber === selectedLineNumber;
          return (
            <button
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40",
              )}
              key={line.lineNumber}
              onClick={() => onSelect(line.lineNumber)}
              type="button"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-foreground">
                  Line {line.lineNumber}
                </span>
                <Badge variant={selected ? "default" : "secondary"}>
                  Qty {line.countedQuantity ?? 0}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {getLineDisplayName(line)}
              </p>
              {line.note ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {line.note}
                </p>
              ) : null}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
