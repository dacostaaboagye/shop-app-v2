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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function ProductsPanel(props: {
  isPending: boolean;
  onLinkProduct: (input: AdminLinkSupplierProductRequest) => void;
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
          <Select
            onChange={(event) =>
              setForm((v) => ({ ...v, productSlug: event.target.value }))
            }
            value={form.productSlug}
          >
            <option value="">Select product</option>
            {props.products.map((product) => (
              <option key={product.slug} value={product.slug}>
                {product.name}
              </option>
            ))}
          </Select>
          <NumberInput
            label="Lead time days"
            min={0}
            onChange={(leadTimeDays) =>
              setForm((v) => ({ ...v, leadTimeDays }))
            }
            value={form.leadTimeDays}
          />
          <NumberInput
            label="MOQ"
            min={1}
            onChange={(minimumOrderQuantity) =>
              setForm((v) => ({ ...v, minimumOrderQuantity }))
            }
            value={form.minimumOrderQuantity}
          />
          <TextInput
            label="Supplier product code"
            onChange={(supplierProductCode) =>
              setForm((v) => ({ ...v, supplierProductCode }))
            }
            value={form.supplierProductCode}
          />
          <TextInput
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
              <SupplierProductRow key={product.productSlug} product={product} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SupplierProductRow({
  product,
}: {
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
    </div>
  );
}

function TextInput(props: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{props.label}</Label>
      <Input
        onChange={(event) => props.onChange(event.target.value)}
        value={props.value}
      />
    </div>
  );
}

function NumberInput(props: {
  label: string;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{props.label}</Label>
      <Input
        min={props.min}
        onChange={(event) => props.onChange(Number(event.target.value))}
        type="number"
        value={props.value}
      />
    </div>
  );
}
