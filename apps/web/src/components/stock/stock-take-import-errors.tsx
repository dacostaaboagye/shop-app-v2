import { AppEmptyState } from "@/components/system/app-empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StockTakeImportDryRunError } from "@/lib/react-query/stock-takes";
import { getErrorAnchor } from "./stock-take-import-review.support";

type StockTakeImportErrorsProps = {
  errors: StockTakeImportDryRunError[];
};

export function StockTakeImportErrors({ errors }: StockTakeImportErrorsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Error report</CardTitle>
        <CardDescription>
          Rows listed here must be corrected in the CSV before the final import
          can proceed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <AppEmptyState
            description="The dry-run did not report row-level validation errors."
            title="No row errors"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {errors.map((error) => (
              <div
                className="rounded-lg border border-border/60 bg-card p-4"
                key={`${error.rowNumber}-${error.code}-${error.field ?? "row"}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="destructive">{error.code}</Badge>
                  <span className="text-sm font-medium text-foreground">
                    {getErrorAnchor(error)}
                  </span>
                  {error.sku ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {error.sku}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {error.message}
                </p>
                {error.field ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Field: {error.field}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
