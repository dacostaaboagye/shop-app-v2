import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/display/format";
import type { StockFilter } from "./worker-assignments-support";
import { formatStockSummary } from "./worker-assignments-support";

export function AssignmentSummary({
  counts,
  itemCount,
  locationName,
}: {
  counts: Record<StockFilter, number>;
  itemCount: number;
  locationName: string | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {locationName ? (
        <p className="type-support">
          <span className="type-data-value text-sm">
            {formatStockSummary(itemCount, locationName)}
          </span>
        </p>
      ) : null}
      {counts.out_of_stock > 0 ? (
        <Badge className="gap-1" variant="destructive">
          <AlertCircle className="size-3" />
          {formatCount(counts.out_of_stock)} out
        </Badge>
      ) : null}
      {counts.low_stock > 0 ? (
        <Badge variant="outline">{formatCount(counts.low_stock)} low</Badge>
      ) : null}
    </div>
  );
}
