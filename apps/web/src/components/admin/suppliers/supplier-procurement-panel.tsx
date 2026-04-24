"use client";

import type {
  AdminCreateSupplierProcurementOrderRequest,
  AdminSupplierDetail,
} from "@shop/contracts";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField, TextField } from "./supplier-form-controls";
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
