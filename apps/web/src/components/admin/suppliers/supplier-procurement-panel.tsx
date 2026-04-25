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
  const [orderForm, setOrderForm] = useState<PurchaseOrderFormState>({
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
