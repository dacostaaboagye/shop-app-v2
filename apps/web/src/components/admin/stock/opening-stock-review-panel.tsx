import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OpeningStockRowReview } from "./opening-stock-row-review";
import type {
  getOpeningStockServerRowErrors,
  parseOpeningStockRows,
} from "./opening-stock-setup.support";
import { OpeningStockSetupBanners } from "./opening-stock-setup-banners";

type Props = {
  canSubmit: boolean;
  className?: string;
  error: unknown;
  hasDraft: boolean;
  isPending: boolean;
  onRemoveRow: (index: number) => void;
  overLimit: boolean;
  readyCount: number;
  rows: ReturnType<typeof parseOpeningStockRows>;
  serverBlockedCount: number;
  serverErrors: ReturnType<typeof getOpeningStockServerRowErrors>;
  successMessage: string | null;
};

export function OpeningStockReviewPanel({
  canSubmit,
  className,
  error,
  hasDraft,
  isPending,
  onRemoveRow,
  overLimit,
  readyCount,
  rows,
  serverBlockedCount,
  serverErrors,
  successMessage,
}: Props) {
  return (
    <aside
      className={cn(
        "rounded-xl border border-border/60 bg-muted/15 p-3 lg:sticky lg:top-4 lg:self-start",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="size-4 text-primary" />
          Review and save
        </h3>
        <p className="text-sm text-muted-foreground">
          Confirm the rows in this batch before creating the opening baseline.
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <OpeningStockRowReview
          onRemoveRow={onRemoveRow}
          rows={rows}
          serverErrors={serverErrors}
        />

        <OpeningStockSetupBanners
          error={error}
          hasDraft={hasDraft}
          overLimit={overLimit}
          rowsLength={rows.length}
          serverBlockedCount={serverBlockedCount}
          successMessage={successMessage}
        />

        <Button className="w-full" disabled={!canSubmit} type="submit">
          {isPending
            ? "Saving..."
            : readyCount > 0
              ? `Save ${readyCount} opening stock`
              : "Save opening stock"}
        </Button>
      </div>
    </aside>
  );
}
