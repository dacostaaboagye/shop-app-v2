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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NumberField, SelectField, TextField } from "./supplier-form-controls";

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
    <div className="flex flex-col gap-6 rounded-xl border border-border/50 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
          Link new product
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="Product"
            onChange={(productSlug) => setForm((v) => ({ ...v, productSlug }))}
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
              setForm((v) => ({ ...v, leadTimeDays }))
            }
            value={form.leadTimeDays}
          />
          <NumberField
            label="MOQ"
            min={1}
            onChange={(minimumOrderQuantity) =>
              setForm((v) => ({ ...v, minimumOrderQuantity }))
            }
            value={form.minimumOrderQuantity}
          />
          <TextField
            label="Supplier product code"
            onChange={(supplierProductCode) =>
              setForm((v) => ({ ...v, supplierProductCode }))
            }
            value={form.supplierProductCode}
          />
          <TextField
            label="Last cost"
            onChange={(lastCostPrice) =>
              setForm((v) => ({ ...v, lastCostPrice }))
            }
            value={form.lastCostPrice}
          />
          <div className="flex items-center gap-2 pt-8">
            <input
              checked={form.isPreferred}
              className="size-4 rounded-md border-border/60 text-primary focus:ring-primary/20"
              id="is-preferred-supplier"
              onChange={(event) =>
                setForm((v) => ({ ...v, isPreferred: event.target.checked }))
              }
              type="checkbox"
            />
            <Label className="font-medium" htmlFor="is-preferred-supplier">
              Preferred supplier
            </Label>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Purchase notes
          </Label>
          <Textarea
            className="min-h-20 rounded-xl border-border/60 bg-muted/20 transition-all focus:bg-background focus:ring-primary/20"
            onChange={(event) =>
              setForm((v) => ({ ...v, notes: event.target.value }))
            }
            placeholder="Commercial terms, delivery notes, or supplier constraints"
            value={form.notes}
          />
        </div>
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
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
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
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{product.productName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/80">
          {product.variantCount} SKU{product.variantCount === 1 ? "" : "s"} •{" "}
          {product.brandName ?? "No brand"} •{" "}
          {product.categoryName ?? "No category"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          className="rounded-md font-bold uppercase tracking-wider text-[10px]"
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
