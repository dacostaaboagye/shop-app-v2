"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import type { ReactNode } from "react";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { formatCount, formatPublicReference } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import type { SupplyRequestStatusPresentation } from "./stock-status";

export function SupplyRequestCompactList({
  items,
  renderActions,
  statusPresentation,
}: {
  items: StockSupplyRequestResponse[];
  renderActions: (item: StockSupplyRequestResponse) => ReactNode;
  statusPresentation: (
    item: StockSupplyRequestResponse,
  ) => SupplyRequestStatusPresentation;
}) {
  return (
    <AppTableWrapper>
      {items.map((item, index) => (
        <SupplyRequestCompactRow
          index={index}
          item={item}
          itemCount={items.length}
          key={item.supplyRequestId}
          renderActions={renderActions}
          status={statusPresentation(item)}
        />
      ))}
    </AppTableWrapper>
  );
}

function SupplyRequestCompactRow({
  index,
  item,
  itemCount,
  renderActions,
  status,
}: {
  index: number;
  item: StockSupplyRequestResponse;
  itemCount: number;
  renderActions: (item: StockSupplyRequestResponse) => ReactNode;
  status: SupplyRequestStatusPresentation;
}) {
  const { accent, icon: StatusIcon, label } = status;
  const quantity = item.approvedQuantity ?? item.requestedQuantity;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center",
        index !== itemCount - 1 && "border-b border-border",
      )}
    >
      <div
        aria-hidden
        className={cn("absolute left-0 top-0 h-full w-0.5", accent.bar)}
      />
      <div className="min-w-0 flex-1 pl-1">
        <p className="truncate text-sm font-medium leading-tight text-foreground">
          {item.skuSnapshot.productName}
        </p>
        <p className="type-support mt-0.5 truncate">
          {item.skuSnapshot.variantName}
        </p>
        <RouteLine item={item} />
        <p className="type-identifier mt-1 text-muted-foreground">
          {formatPublicReference(item.reference)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-left sm:ml-auto sm:flex-nowrap sm:text-right">
        <div>
          <p className="type-data-label text-muted-foreground">Qty</p>
          <p className="text-xs font-semibold tabular-nums text-foreground">
            {formatCount(quantity)}
          </p>
        </div>
        <div className="min-w-[92px]">
          <p className="type-data-label text-left text-muted-foreground sm:text-center">
            Status
          </p>
          <div
            className={cn(
              "mt-0.5 flex w-fit items-center justify-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:ml-auto sm:w-auto",
              accent.badge,
            )}
          >
            <StatusIcon className="size-2.5" />
            {label}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className={cn("rounded-full p-1 sm:hidden", accent.icon)}>
          <StatusIcon className="size-3.5" />
        </span>
        {renderActions(item)}
      </div>
    </div>
  );
}

function RouteLine({ item }: { item: StockSupplyRequestResponse }) {
  if (!item.sourceLocationName && !item.locationName) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
      {item.sourceLocationName ? <span>{item.sourceLocationName}</span> : null}
      {item.sourceLocationName && item.locationName ? (
        <span className="opacity-50">to</span>
      ) : null}
      {item.locationName ? <span>{item.locationName}</span> : null}
    </div>
  );
}
