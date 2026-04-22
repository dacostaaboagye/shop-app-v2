"use client";

import type {
  AdminLinkSupplierProductRequest,
  AdminProductSummary,
  AdminSupplierDetail,
} from "@shop/contracts";
import { Package } from "lucide-react";
import { useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
    supplierProductCode: "",
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product links</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-3">
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
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input
              checked={form.isPreferred}
              onChange={(event) =>
                setForm((v) => ({ ...v, isPreferred: event.target.checked }))
              }
              type="checkbox"
            />
            Preferred supplier
          </label>
        </div>
        <Textarea
          onChange={(event) =>
            setForm((v) => ({ ...v, notes: event.target.value }))
          }
          placeholder="Commercial terms, delivery notes, or supplier constraints"
          value={form.notes}
        />
        <Button
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
        {props.supplierProducts.length === 0 ? (
          <AppEmptyState
            description="Product links allow this supplier to provide every SKU under the selected product."
            icon={Package}
            kind="no-data"
            title="No products linked"
          />
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {props.supplierProducts.map((product) => (
              <SupplierProductRow
                key={product.productSlug}
                onRemove={props.onUnlinkProduct}
                product={product}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SupplierProductRow({
  onRemove,
  product,
}: {
  onRemove: (productSlug: string) => void;
  product: AdminSupplierDetail["products"][number];
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div>
        <p className="font-medium">{product.productName}</p>
        <p className="text-sm text-muted-foreground">
          {product.variantCount} SKU{product.variantCount === 1 ? "" : "s"} -{" "}
          {product.brandName ?? "No brand"} -{" "}
          {product.categoryName ?? "No category"}
        </p>
      </div>
      <Badge variant="outline">MOQ {product.minimumOrderQuantity}</Badge>
      <Button
        onClick={() => onRemove(product.productSlug)}
        size="sm"
        type="button"
        variant="outline"
      >
        Remove
      </Button>
    </div>
  );
}
