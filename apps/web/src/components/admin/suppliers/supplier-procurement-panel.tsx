"use client";

import type {
  AdminCreateSupplierProcurementOrderRequest,
  AdminSupplierDetail,
} from "@shop/contracts";
import { ShoppingCart } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
    <Card>
      <CardHeader>
        <CardTitle>Supply lifecycle</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <PurchaseOrderForm
          form={orderForm}
          onChange={setOrderForm}
          onCreate={props.onCreateOrder}
          variants={variants}
        />
        {props.orders.length === 0 ? (
          <AppEmptyState
            description="Supplier purchase orders, approvals, dispatch, receipts, and closure will appear here."
            icon={ShoppingCart}
            kind="no-data"
            title="No procurement orders"
          />
        ) : (
          props.orders.map((order) => (
            <OrderRow
              key={order.reference}
              onAction={props.onAction}
              onReceive={props.onReceive}
              order={order}
            />
          ))
        )}
      </CardContent>
    </Card>
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
      <div className="grid gap-3 md:grid-cols-3">
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
      <Textarea
        onChange={(event) =>
          props.onChange((value) => ({ ...value, notes: event.target.value }))
        }
        placeholder="Internal purchasing note or delivery instruction"
        value={props.form.notes}
      />
      <Button
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
    </>
  );
}

function OrderRow(props: {
  onAction: (reference: string, action: ProcurementAction) => void;
  onReceive: (
    reference: string,
    lines: Array<{ receivedQuantity: number; variantSlug: string }>,
  ) => void;
  order: AdminSupplierDetail["procurementOrders"][number];
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{props.order.reference}</p>
          <p className="text-sm text-muted-foreground">
            {props.order.destinationLocationName ?? "No destination"} -{" "}
            {props.order.lines.length} line(s)
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
