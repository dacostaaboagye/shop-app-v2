import type {
  AdminStockBalanceListResponse,
  AdminStockBalanceSummary,
} from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { StockWorkspaceTableSkeleton } from "@/components/stock/stock-workspace-feedback";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";

type Props = {
  columns: ColumnDef<AdminStockBalanceSummary>[];
  data: AdminStockBalanceListResponse | undefined;
  error: unknown;
  hasFilters: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
};

export function StockBalanceTableSection({
  columns,
  data,
  error,
  hasFilters,
  isError,
  isFetching,
  onRetry,
}: Props) {
  return (
    <AppTableWrapper>
      {isFetching && !data ? (
        <StockWorkspaceTableSkeleton
          keys={["sb-1", "sb-2", "sb-3", "sb-4", "sb-5"]}
          rowClassName="h-12 w-full rounded-lg"
        />
      ) : isError ? (
        <div className="p-8">
          <AppErrorBanner
            detail="Could not load stock levels for the selected filters."
            error={error}
            onRetry={onRetry}
            title="Unable to load stock levels"
          />
        </div>
      ) : (
        <AppDataTable
          columns={columns}
          data={data?.items ?? []}
          density="compact"
          emptyDescription={
            hasFilters
              ? "No stock matches the selected filters."
              : "No stock has been entered or dispatched in transit yet."
          }
          emptyTitle="No stock data"
          getRowId={(row) => `${row.locationSlug}:${row.skuId}`}
        />
      )}
    </AppTableWrapper>
  );
}
