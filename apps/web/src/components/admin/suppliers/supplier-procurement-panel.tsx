"use client";

import type {
  AdminCreateSupplierProcurementOrderRequest,
  AdminSupplierDetail,
} from "@shop/contracts";
import { ShoppingCart } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SelectField, TextField } from "./supplier-form-controls";

type ProcurementAction = "approve" | "cancel" | "close" | "order" | "submit";
type PurchaseOrderFormState = {
  notes: string;
  quantity: number;
  unitCost: string;
  variantSlug: string;
};

export function ProcurementPanel(props: {
  onAction: (reference: string, action: ProcurementAction) => void;
  onCreateOrder: (input: AdminCreateSupplierProcurementOrderRequest) => void;
  onReceive: (
    reference: string,
    lines: Array<{ receivedQuantity: number; variantSlug: string }>,
  ) => void;
  orders: AdminSupplierDetail["procurementOrders"];
  supplierProducts: AdminSupplierDetail["products"];
}) {
  const [orderForm, setOrderForm] = useState({
    notes: "",
    quantity: 1,
    unitCost: "",
    variantSlug: "",
  });
  const variants = props.supplierProducts.flatMap((product) =>
    product.variants.map((variant) => ({
      ...variant,
      productName: product.productName,
    })),
  );

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border/50 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
          Draft purchase order
        </h3>
        <PurchaseOrderForm
          form={orderForm}
          onChange={setOrderForm}
          onCreate={props.onCreateOrder}
          variants={variants}
        />
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
          Managed lifecycle
        </h3>
        {props.orders.length === 0 ? (
          <AppEmptyState
            description="Supplier purchase orders, approvals, dispatch, receipts, and closure will appear here."
            icon={ShoppingCart}
            kind="no-data"
            title="No procurement orders"
          />
        ) : (
          <AppTableWrapper>
            {props.orders.map((order, index) => (
              <OrderRow
                index={index}
                itemCount={props.orders.length}
                key={order.reference}
                onAction={props.onAction}
                onReceive={props.onReceive}
                order={order}
              />
            ))}
          </AppTableWrapper>
        )}
      </div>
    </div>
  );
}

function PurchaseOrderForm(props: {
  form: PurchaseOrderFormState;
  onChange: Dispatch<SetStateAction<PurchaseOrderFormState>>;
  onCreate: (input: AdminCreateSupplierProcurementOrderRequest) => void;
  variants: Array<{ productName: string; sku: string; variantSlug: string }>;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField
          label="SKU"
          onChange={(variantSlug) =>
            props.onChange((value) => ({
              ...value,
              variantSlug,
            }))
          }
          options={props.variants.map((variant) => ({
            label: `${variant.productName} - ${variant.sku}`,
            value: variant.variantSlug,
          }))}
          placeholder="Select SKU"
          value={props.form.variantSlug}
        />
        <TextField
          label="Quantity"
          onChange={(quantity) =>
            props.onChange((value) => ({
              ...value,
              quantity: Number(quantity),
            }))
          }
          type="number"
          value={String(props.form.quantity)}
        />
        <TextField
          label="Unit cost"
          onChange={(unitCost) =>
            props.onChange((value) => ({ ...value, unitCost }))
          }
          value={props.form.unitCost}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Purchasing notes
        </Label>
        <Textarea
          className="min-h-20 rounded-xl border-border/60 bg-muted/20 transition-all focus:bg-background focus:ring-primary/20"
          onChange={(event) =>
            props.onChange((value) => ({ ...value, notes: event.target.value }))
          }
          placeholder="Internal purchasing note or delivery instruction"
          value={props.form.notes}
        />
      </div>
      <div className="flex justify-start">
        <Button
          className="h-11 rounded-xl px-8"
          disabled={!props.form.variantSlug}
          onClick={() =>
            props.onCreate({
              lines: [
                {
                  requestedQuantity: props.form.quantity,
                  unitCost: props.form.unitCost || null,
                  variantSlug: props.form.variantSlug,
                },
              ],
              notes: props.form.notes || null,
            })
          }
          size="sm"
          type="button"
        >
          Draft purchase order
        </Button>
      </div>
    </>
  );
}

function OrderRow(props: {
  index: number;
  itemCount: number;
  onAction: (reference: string, action: ProcurementAction) => void;
  onReceive: (
    reference: string,
    lines: Array<{ receivedQuantity: number; variantSlug: string }>,
  ) => void;
  order: AdminSupplierDetail["procurementOrders"][number];
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4",
        props.index !== props.itemCount - 1 && "border-b border-border/50",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">
              {props.order.reference}
            </p>
            <Badge
              className="rounded-md font-bold uppercase tracking-wider text-[10px]"
              variant="secondary"
            >
              {props.order.status.replaceAll("_", " ")}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            {props.order.destinationLocationName ?? "Direct shipment"} •{" "}
            {props.order.lines.length} line item
            {props.order.lines.length === 1 ? "" : "s"}
          </p>
        </div>
        <Badge variant="outline">
          {props.order.status.replaceAll("_", " ")}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {nextActions(props.order.status).map((action) => (
          <Button
            key={action}
            onClick={() => props.onAction(props.order.reference, action)}
            size="sm"
            type="button"
            variant="outline"
          >
            {action}
          </Button>
        ))}
        {props.order.status === "ordered" ||
        props.order.status === "partially_received" ? (
          <Button
            onClick={() =>
              props.onReceive(
                props.order.reference,
                props.order.lines.map((line) => ({
                  receivedQuantity:
                    line.approvedQuantity ?? line.requestedQuantity,
                  variantSlug: line.variantSlug,
                })),
              )
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Receive all
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function nextActions(
  status: AdminSupplierDetail["procurementOrders"][number]["status"],
) {
  if (status === "draft") return ["submit", "cancel"] as const;
  if (status === "submitted") return ["approve", "cancel"] as const;
  if (status === "approved") return ["order", "cancel"] as const;
  if (status === "partially_received" || status === "received") {
    return ["close"] as const;
  }
  return [] as const;
}
