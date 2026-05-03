import { Badge } from "@/components/ui/badge";
import type {
  getOpeningStockServerRowErrors,
  parseOpeningStockRows,
} from "./opening-stock-setup.support";
import { getOpeningStockVisibleReviewRows } from "./opening-stock-setup.support";

type Props = {
  rows: ReturnType<typeof parseOpeningStockRows>;
  serverErrors: ReturnType<typeof getOpeningStockServerRowErrors>;
};

export function OpeningStockRowReview({ rows, serverErrors }: Props) {
  const visibleRows = getOpeningStockVisibleReviewRows({ rows, serverErrors });

  return (
    <div className="min-w-0 rounded-lg border border-border/50 bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Review rows</h3>
        <span className="text-xs text-muted-foreground">
          {rows.length} total rows
        </span>
      </div>
      <div className="mt-3 flex max-h-96 flex-col gap-2 overflow-auto">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            Paste SKU rows to preview what will be initialized before submit.
          </div>
        ) : (
          visibleRows.map(({ row, index }) => {
            const rowServerErrors = serverErrors.filter(
              (error) =>
                error.index === index ||
                error.sku?.toUpperCase() === row.sku.toUpperCase(),
            );
            const errors = [
              ...row.errors,
              ...rowServerErrors.map((rowError) => rowError.message),
            ];

            return (
              <div
                className="rounded-lg border border-border/60 p-3"
                key={`${row.lineNumber}:${row.sku}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm">{row.sku}</span>
                  <Badge
                    variant={errors.length > 0 ? "destructive" : "outline"}
                  >
                    {errors.length > 0 ? "Blocked" : "Ready"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Line {row.lineNumber}, quantity{" "}
                  {row.onHandQuantity === null ? "invalid" : row.onHandQuantity}
                </p>
                {errors.length > 0 ? (
                  <p className="mt-2 text-sm text-destructive">
                    {errors.join(" ")}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
        {rows.length > 100 ? (
          <p className="text-sm text-muted-foreground">
            Showing first 100 rows plus any server-blocked rows. All{" "}
            {rows.length} rows are validated before submit.
          </p>
        ) : null}
      </div>
    </div>
  );
}
