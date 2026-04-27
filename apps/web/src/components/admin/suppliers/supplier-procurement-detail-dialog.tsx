"use client";

import type { AdminSupplierDetail } from "@shop/contracts";
import { CircleDashed, MapPin, Package, Truck } from "lucide-react";
import { AppDialog, AppDialogBody } from "@/components/system/app-dialog";
import { Badge } from "@/components/ui/badge";
import {
  formatCount,
  formatDateTime,
  formatPublicReference,
} from "@/lib/display/format";
import { cn } from "@/lib/utils";
import {
  buildProcurementTimeline,
  formatProcurementStatus,
} from "./supplier-procurement-list.support";

type ProcurementOrder = AdminSupplierDetail["procurementOrders"][number];

export function SupplierProcurementDetailDialog({
  onOpenChange,
  open,
  order,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  order: ProcurementOrder | null;
}) {
  return (
    <AppDialog
      description="Review the order details, line quantities, and lifecycle progress for this supplier request."
      onOpenChange={onOpenChange}
      open={open}
      size="xl"
      title={
        order
          ? `Procurement ${formatPublicReference(order.reference)}`
          : "Procurement details"
      }
    >
      {order ? (
        <AppDialogBody className="gap-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              icon={CircleDashed}
              label="Status"
              value={formatProcurementStatus(order.status)}
            />
            <SummaryTile
              icon={MapPin}
              label="Destination"
              value={order.destinationLocationName ?? "Direct shipment"}
            />
            <SummaryTile
              icon={Package}
              label="Lines"
              value={`${formatCount(order.lines.length)} item${order.lines.length === 1 ? "" : "s"}`}
            />
            <SummaryTile
              icon={Truck}
              label="Expected"
              value={formatDateTime(order.expectedAt, {
                empty: "Not set",
              })}
            />
          </div>

          {order.notes ? (
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <p className="type-data-label text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm text-foreground">{order.notes}</p>
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-xl border border-border/60 bg-card">
              <div className="border-b border-border/60 px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Order lines
                </h3>
              </div>
              <div className="divide-y divide-border/60">
                {order.lines.map((line) => (
                  <div
                    className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                    key={line.variantSlug}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {line.productName}
                      </p>
                      <p className="type-support">{line.variantName}</p>
                      <p className="type-identifier mt-1">{line.sku}</p>
                    </div>
                    <QuantityCell
                      label="Requested"
                      value={String(line.requestedQuantity)}
                    />
                    <QuantityCell
                      label="Approved"
                      value={
                        line.approvedQuantity == null
                          ? "Not set"
                          : String(line.approvedQuantity)
                      }
                    />
                    <QuantityCell
                      label="Received"
                      value={String(line.receivedQuantity)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card">
              <div className="border-b border-border/60 px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Lifecycle timeline
                </h3>
              </div>
              <div className="flex flex-col gap-0 px-4 py-3">
                {buildProcurementTimeline(order).map((item, index, items) => (
                  <div
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-3"
                    key={item.label}
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "mt-1 size-3 rounded-full border-2",
                          item.isCurrent
                            ? "border-primary bg-primary"
                            : item.isComplete
                              ? "border-success bg-success"
                              : "border-border bg-background",
                        )}
                      />
                      {index < items.length - 1 ? (
                        <span className="my-1 h-full w-px bg-border" />
                      ) : null}
                    </div>
                    <div className="pb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {item.label}
                        </p>
                        {item.isCurrent ? (
                          <Badge variant="secondary">Current</Badge>
                        ) : null}
                      </div>
                      <p className="type-support mt-1">{item.description}</p>
                      <p className="type-support mt-1 text-muted-foreground">
                        {formatDateTime(item.at, { empty: "Not reached yet" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AppDialogBody>
      ) : null}
    </AppDialog>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CircleDashed;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <p className="type-data-label text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function QuantityCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[72px] flex-col gap-1 sm:items-end">
      <p className="type-data-label text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
