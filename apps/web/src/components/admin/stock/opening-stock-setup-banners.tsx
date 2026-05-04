import { AppBanner } from "@/components/system/app-banner";
import { AppErrorBanner } from "@/components/system/app-error";
import { MAX_OPENING_STOCK_ROWS } from "./opening-stock-setup.support";

type Props = {
  error: unknown;
  hasDraft: boolean;
  overLimit: boolean;
  rowsLength: number;
  serverBlockedCount: number;
  successMessage: string | null;
};

export function OpeningStockSetupBanners({
  error,
  hasDraft,
  overLimit,
  rowsLength,
  serverBlockedCount,
  successMessage,
}: Props) {
  return (
    <>
      {successMessage ? (
        <AppBanner
          description={successMessage}
          title="Opening stock saved"
          tone="success"
        />
      ) : null}

      {overLimit ? (
        <AppBanner
          description={`This batch has ${rowsLength} rows. Split it into batches of ${MAX_OPENING_STOCK_ROWS} rows or fewer before submitting.`}
          title="Batch is too large"
          tone="warning"
        />
      ) : null}

      {hasDraft ? (
        <AppBanner
          description="Use Add count to review before saving so the selected product and quantity are included."
          title="Add selected product first"
          tone="warning"
        />
      ) : null}

      {serverBlockedCount > 0 ? (
        <AppBanner
          description="Remove or correct the blocked rows shown in the review list before saving again."
          title="Blocked rows need attention"
          tone="warning"
        />
      ) : null}

      {error ? (
        <AppErrorBanner error={error} title="Opening stock not saved" />
      ) : null}
    </>
  );
}
