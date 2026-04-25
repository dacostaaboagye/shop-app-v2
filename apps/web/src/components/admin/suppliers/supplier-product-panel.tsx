"use client";

import type {
  AdminLinkSupplierProductRequest,
  AdminProductSummary,
  AdminSupplierDetail,
} from "@shop/contracts";
import { Package } from "lucide-react";
import { useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NumberField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "./supplier-form-controls";

export function ProductsPanel(props: {
  isPending: boolean;
  onLinkProduct: (input: AdminLinkSupplierProductRequest) => void;
  onUnlinkProduct: (productSlug: string) => void;
  products: AdminProductSummary[];
  supplierProducts: AdminSupplierDetail["products"];
}) {
  const [form, setForm] = useState({
    isPreferred: false,
    lastCostPrice: "",
    leadTimeDays: 0,
    minimumOrderQuantity: 1,
    notes: "",
    productSlug: "",
    status: "active" as const,
    supplierProductCode: "",
  });

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Link new product
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="Product"
            onChange={(productSlug) =>
              setForm((value) => ({ ...value, productSlug }))
            }
            options={props.products.map((product) => ({
              label: product.name,
              value: product.slug,
            }))}
            placeholder="Select product"
            value={form.productSlug}
          />
          <NumberField
            label="Lead time days"
            min={0}
            onChange={(leadTimeDays) =>
              setForm((value) => ({ ...value, leadTimeDays }))
            }
            value={form.leadTimeDays}
          />
          <NumberField
            label="MOQ"
            min={1}
            onChange={(minimumOrderQuantity) =>
              setForm((value) => ({ ...value, minimumOrderQuantity }))
            }
            value={form.minimumOrderQuantity}
          />
          <TextField
            label="Supplier product code"
            onChange={(supplierProductCode) =>
              setForm((value) => ({ ...value, supplierProductCode }))
            }
            value={form.supplierProductCode}
          />
          <TextField
            description="Use the supplier's quoted or last agreed cost."
            inputMode="decimal"
            label="Last cost"
            onChange={(lastCostPrice) =>
              setForm((value) => ({ ...value, lastCostPrice }))
            }
            placeholder="0.00"
            value={form.lastCostPrice}
          />
          <SwitchField
            description="Use this when the supplier should be the default sourcing option for this product."
            label="Preferred supplier"
            onChange={(isPreferred) =>
              setForm((value) => ({ ...value, isPreferred }))
            }
            value={form.isPreferred}
          />
        </div>
        <TextAreaField
          description="Capture commercial terms, delivery constraints, or negotiation notes."
          label="Purchase notes"
          onChange={(notes) => setForm((value) => ({ ...value, notes }))}
          placeholder="Commercial terms, delivery notes, or supplier constraints"
          value={form.notes}
        />
        <div className="flex justify-start">
          <Button
            className="h-11 rounded-xl px-8"
            disabled={!form.productSlug || props.isPending}
            onClick={() =>
              props.onLinkProduct({
                ...form,
                lastCostPrice: form.lastCostPrice || null,
                notes: form.notes || null,
                supplierProductCode: form.supplierProductCode || null,
              })
            }
            size="sm"
            type="button"
          >
            Link product
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Linked products
        </h3>
        {props.supplierProducts.length === 0 ? (
          <AppEmptyState
            description="Product links allow this supplier to provide every SKU under the selected product."
            icon={Package}
            kind="no-data"
            title="No products linked"
          />
        ) : (
          <AppTableWrapper>
            {props.supplierProducts.map((product, index) => (
              <SupplierProductRow
                index={index}
                itemCount={props.supplierProducts.length}
                key={product.productSlug}
                onRemove={props.onUnlinkProduct}
                product={product}
              />
            ))}
          </AppTableWrapper>
        )}
      </div>
    </div>
  );
}

function SupplierProductRow({
  index,
  itemCount,
  onRemove,
  product,
}: {
  index: number;
  itemCount: number;
  onRemove: (productSlug: string) => void;
  product: AdminSupplierDetail["products"][number];
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-4",
        index !== itemCount - 1 && "border-b border-border/50",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{product.productName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/80">
          {product.variantCount} SKU{product.variantCount === 1 ? "" : "s"} |{" "}
          {product.brandName ?? "No brand"} |{" "}
          {product.categoryName ?? "No category"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          className="rounded-md text-[10px] font-semibold"
          variant="secondary"
        >
          MOQ {product.minimumOrderQuantity}
        </Badge>
        <Button
          className="h-8 rounded-lg"
          onClick={() => onRemove(product.productSlug)}
          size="sm"
          type="button"
          variant="outline"
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
