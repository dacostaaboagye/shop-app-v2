import type {
  AdminOpeningStockRequest,
  AdminOpeningStockResponse,
  AdminStockBalanceSummary,
  AdminStockCountRequest,
} from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { OpeningStockSetupWorkspace } from "@/components/admin/stock/opening-stock-setup-workspace";
import { StockCountDialog } from "@/components/admin/stock/stock-count-dialog";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { ManagerBulkSupplyRequestDialog } from "@/components/manager/stock/manager-bulk-supply-request-dialog";
import { toSupplyRequestTarget } from "@/components/manager/stock/manager-stock-page-client.support";
import { StockWorkspaceTableSkeleton } from "@/components/stock/stock-workspace-feedback";
import { StockMetricGrid } from "@/components/stock/stock-workspace-panels";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Button } from "@/components/ui/button";
import type { SupplyRequestTarget } from "@/components/worker/stock/supply-request-dialog.types";

type LocationScope = {
  locationId: string;
  locationName: string;
  locationSlug: string;
};

export function ManagerOpeningStockSetup({
  canCount,
  error,
  isPending,
  location,
  onSubmit,
  resetKey,
  success,
}: {
  canCount: boolean;
  error: unknown;
  isPending: boolean;
  location: LocationScope | null | undefined;
  onSubmit: (request: AdminOpeningStockRequest) => void;
  resetKey: number;
  success: AdminOpeningStockResponse | undefined;
}) {
  if (!canCount || !location) return null;

  return (
    <OpeningStockSetupWorkspace
      error={error}
      isPending={isPending}
      key={`${location.locationSlug}:${resetKey}`}
      lookup={{ locationId: location.locationId, type: "manager" }}
      locationName={location.locationName}
      locationSlug={location.locationSlug}
      onSubmit={onSubmit}
      successMessage={
        success
          ? `${success.initializedCount} SKU baseline(s) were initialized for ${success.locationName}.`
          : null
      }
    />
  );
}

export function ManagerStockMetrics({
  items,
  totalCount,
}: {
  items: AdminStockBalanceSummary[];
  totalCount: number;
}) {
  const totals = items.reduce(
    (acc, item) => ({
      available: acc.available + item.availableQuantity,
      inTransit: acc.inTransit + item.inTransitQuantity,
      onHand: acc.onHand + item.onHandQuantity,
      reserved: acc.reserved + item.reservedQuantity,
    }),
    { available: 0, inTransit: 0, onHand: 0, reserved: 0 },
  );

  return (
    <StockMetricGrid
      items={[
        { label: "SKUs", value: totalCount },
        { label: "On hand", value: totals.onHand },
        { label: "Reserved", value: totals.reserved },
        { label: "Available", value: totals.available },
        { label: "In transit", value: totals.inTransit },
      ]}
    />
  );
}

export function ManagerStockCountDialogSection({
  error,
  isPending,
  locationName,
  locationSlug,
  onOpenChange,
  onSubmit,
  open,
  row,
}: {
  error: unknown;
  isPending: boolean;
  locationName: string;
  locationSlug: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: AdminStockCountRequest) => void;
  open: boolean;
  row: AdminStockBalanceSummary | null;
}) {
  return (
    <StockCountDialog
      error={error}
      isPending={isPending}
      locationName={locationName}
      locationSlug={locationSlug}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      open={open}
      row={row}
    />
  );
}

export function ManagerBulkSupplyDialogSection({
  onOpenChange,
  open,
  targets,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  targets: SupplyRequestTarget[];
}) {
  return (
    <ManagerBulkSupplyRequestDialog
      onOpenChange={onOpenChange}
      open={open}
      targets={targets}
    />
  );
}

export function ManagerStockTableSection({
  canRequestSupply,
  columns,
  error,
  isError,
  isPending,
  items,
  location,
  onOpenSupplyRequest,
  onRetry,
}: {
  canRequestSupply: boolean;
  columns: ColumnDef<AdminStockBalanceSummary>[];
  error: unknown;
  isError: boolean;
  isPending: boolean;
  items: AdminStockBalanceSummary[];
  location: LocationScope | null | undefined;
  onOpenSupplyRequest: (targets: SupplyRequestTarget[]) => void;
  onRetry: () => void;
}) {
  return (
    <AppTableWrapper>
      {isPending && location ? (
        <StockWorkspaceTableSkeleton
          keys={[1, 2, 3, 4, 5, 6, 7, 8]}
          rowClassName="h-10 w-full rounded-lg"
        />
      ) : isError ? (
        <div className="p-8">
          <AppErrorBanner
            detail="Could not load stock data for this location."
            error={error}
            onRetry={onRetry}
            title="Unable to load stock"
          />
        </div>
      ) : (
        <AppDataTable
          bulkActions={buildSupplyRequestBulkActions({
            canRequestSupply,
            location,
            onOpenSupplyRequest,
          })}
          columns={columns}
          data={items}
          density="compact"
          emptyDescription={
            location
              ? "No stock entered or in transit yet at this location."
              : "Select a location above to load stock data."
          }
          emptyTitle="No stock data"
          getRowId={(row: AdminStockBalanceSummary) => row.skuId}
        />
      )}
    </AppTableWrapper>
  );
}

function buildSupplyRequestBulkActions({
  canRequestSupply,
  location,
  onOpenSupplyRequest,
}: {
  canRequestSupply: boolean;
  location: LocationScope | null | undefined;
  onOpenSupplyRequest: (targets: SupplyRequestTarget[]) => void;
}) {
  if (!canRequestSupply || !location) return undefined;

  return {
    render: ({
      clearSelection,
      selectedRows,
    }: {
      clearSelection: () => void;
      selectedRows: AdminStockBalanceSummary[];
    }) => (
      <Button
        onClick={() => {
          onOpenSupplyRequest(
            selectedRows.map((row) =>
              toSupplyRequestTarget(row, {
                locationId: location.locationId,
                locationName: location.locationName,
              }),
            ),
          );
          clearSelection();
        }}
        size="sm"
        type="button"
      >
        Request supply
      </Button>
    ),
    selectionAriaLabel: "stock items",
  };
}
