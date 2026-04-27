"use client";

import type {
  AdminCreateSupplierProcurementOrderRequest,
  AdminSupplierDetail,
} from "@shop/contracts";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "./supplier-form-controls";
import {
  type ProcurementAction,
  SupplierProcurementList,
} from "./supplier-procurement-list";
import {
  appendProcurementDraftLine,
  buildProcurementOrderPayload,
  type PurchaseOrderDraftLine,
  removeProcurementDraftLine,
} from "./supplier-procurement-panel.support";

type PurchaseOrderFormState = {
  lines: PurchaseOrderDraftLine[];
  notes: string;
  quantity: number;
  unitCost: string;
  variantSlug: string;
};

export function ProcurementPanel(props: {
  isPending?: boolean;
  onAction: (reference: string, action: ProcurementAction) => void;
  onCreateOrder: (input: AdminCreateSupplierProcurementOrderRequest) => void;
  onReceive: (
    reference: string,
    lines: Array<{ receivedQuantity: number; variantSlug: string }>,
  ) => void;
  orders: AdminSupplierDetail["procurementOrders"];
  supplierProducts: AdminSupplierDetail["products"];
}) {
  const [orderForm, setOrderForm] = useState<PurchaseOrderFormState>({
    lines: [],
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
    <div className="flex flex-col gap-6 rounded-xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Draft purchase order
        </h3>
        <PurchaseOrderForm
          form={orderForm}
          onChange={setOrderForm}
          onCreate={props.onCreateOrder}
          isPending={props.isPending ?? false}
          variants={variants}
        />
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Managed lifecycle
        </h3>
        <SupplierProcurementList
          onAction={props.onAction}
          onReceive={props.onReceive}
          orders={props.orders}
        />
      </div>
    </div>
  );
}

function PurchaseOrderForm(props: {
  form: PurchaseOrderFormState;
  isPending: boolean;
  onChange: Dispatch<SetStateAction<PurchaseOrderFormState>>;
  onCreate: (input: AdminCreateSupplierProcurementOrderRequest) => void;
  variants: Array<{ productName: string; sku: string; variantSlug: string }>;
}) {
  const selectedVariant = props.variants.find(
    (variant) => variant.variantSlug === props.form.variantSlug,
  );

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
          inputMode="numeric"
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
          inputMode="decimal"
          onChange={(unitCost) =>
            props.onChange((value) => ({ ...value, unitCost }))
          }
          placeholder="0.00"
          value={props.form.unitCost}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!props.form.variantSlug || props.isPending}
          onClick={() =>
            props.onChange((value) => ({
              ...value,
              lines: appendProcurementDraftLine(value.lines, {
                quantity: value.quantity,
                unitCost: value.unitCost,
                variantSlug: value.variantSlug,
              }),
              quantity: 1,
              unitCost: "",
              variantSlug: "",
            }))
          }
          size="sm"
          type="button"
          variant="outline"
        >
          Add line item
        </Button>
        {selectedVariant ? (
          <p className="type-support">
            Queue{" "}
            <span className="font-medium text-foreground">
              {selectedVariant.productName}
            </span>{" "}
            / {selectedVariant.sku}
          </p>
        ) : null}
      </div>
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="border-b border-border/60 px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground">
            Draft line items
          </h4>
        </div>
        <div className="divide-y divide-border/60">
          {props.form.lines.length === 0 ? (
            <p className="type-support px-4 py-4">
              Add one or more supplier items before drafting the purchase order.
            </p>
          ) : (
            props.form.lines.map((line) => {
              const variant = props.variants.find(
                (item) => item.variantSlug === line.variantSlug,
              );

              return (
                <div
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                  key={line.variantSlug}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {variant?.productName ?? "Selected product"}
                    </p>
                    <p className="type-support">
                      {variant?.sku ?? line.variantSlug} | Qty {line.quantity}
                    </p>
                    <p className="type-support">
                      Unit cost {line.unitCost || "Not set"}
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      props.onChange((value) => ({
                        ...value,
                        lines: removeProcurementDraftLine(
                          value.lines,
                          line.variantSlug,
                        ),
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Remove
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
      <TextAreaField
        description="Capture the buying rationale, delivery expectation, or internal handoff note."
        label="Purchasing notes"
        onChange={(notes) =>
          props.onChange((value) => ({
            ...value,
            notes,
          }))
        }
        placeholder="Internal purchasing note or delivery instruction"
        value={props.form.notes}
      />
      <div className="flex justify-start">
        <Button
          className="h-11 rounded-xl px-8"
          disabled={props.form.lines.length === 0 || props.isPending}
          onClick={() =>
            props.onCreate(buildProcurementOrderPayload(props.form))
          }
          size="sm"
          type="button"
        >
          {props.isPending ? "Creating..." : "Draft purchase order"}
        </Button>
      </div>
    </>
  );
}
