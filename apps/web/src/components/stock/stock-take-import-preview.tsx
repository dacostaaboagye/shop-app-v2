import { AppEmptyState } from "@/components/system/app-empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StockTakeImportDryRunRow } from "@/lib/react-query/stock-takes";
import {
  getRowDisplayName,
  getRowTone,
} from "./stock-take-import-review.support";

type StockTakeImportPreviewProps = {
  rows: StockTakeImportDryRunRow[];
};

export function StockTakeImportPreview({ rows }: StockTakeImportPreviewProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Row preview</CardTitle>
        <CardDescription>
          Review matched SKUs, counted quantities, system stock, reservations,
          availability, and variance before applying any stock change.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <AppEmptyState
            description="Upload a workbook or CSV fallback and run the preview to see row-level results."
            title="No preview rows"
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="hidden rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground xl:grid xl:grid-cols-[5rem_minmax(10rem,1.4fr)_repeat(5,minmax(5rem,0.7fr))_6rem] xl:gap-3">
              <span>Row</span>
              <span>Item</span>
              <span>Counted</span>
              <span>On hand</span>
              <span>Reserved</span>
              <span>Available</span>
              <span>Variance</span>
              <span>Status</span>
            </div>
            {rows.map((row) => (
              <PreviewRow
                key={`${row.rowNumber}-${row.sku ?? "unknown"}`}
                row={row}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewRow({ row }: { row: StockTakeImportDryRunRow }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 xl:grid xl:grid-cols-[5rem_minmax(10rem,1.4fr)_repeat(5,minmax(5rem,0.7fr))_6rem] xl:items-center xl:gap-3">
      <div className="flex items-center justify-between gap-3 xl:block">
        <span className="text-xs font-medium text-muted-foreground xl:hidden">
          Row
        </span>
        <span className="font-medium text-foreground">{row.rowNumber}</span>
      </div>
      <div className="mt-3 min-w-0 xl:mt-0">
        <p className="truncate font-medium text-foreground">
          {getRowDisplayName(row)}
        </p>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
          {row.sku} - Line {row.lineNumber ?? "-"}
        </p>
      </div>
      <Quantity label="Counted" value={row.countedQuantity} />
      <Quantity label="On hand" value={row.systemOnHand} />
      <Quantity label="Reserved" value={row.reservedQuantity} />
      <Quantity label="Available" value={row.availableQuantity} />
      <Quantity label="Variance" value={row.variance} />
      <div className="mt-3 xl:mt-0">
        <Badge variant={getRowTone(row)}>{row.status}</Badge>
      </div>
    </div>
  );
}

function Quantity({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 xl:mt-0 xl:block">
      <span className="text-xs font-medium text-muted-foreground xl:hidden">
        {label}
      </span>
      <span className="text-sm text-foreground">{formatQuantity(value)}</span>
    </div>
  );
}

function formatQuantity(value: number | null) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}
