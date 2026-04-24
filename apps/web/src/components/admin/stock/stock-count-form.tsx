"use client";

import type {
  AdminStockBalanceSummary,
  AdminStockCountRequest,
} from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminProductQueryKey,
  adminProductsQueryKey,
  fetchAdminProduct,
  fetchAdminProducts,
} from "@/lib/react-query/admin-catalog-products";

const PRODUCTS_QUERY = {
  brandSlug: "",
  categorySlug: "",
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "active" as const,
};

export function StockCountForm({
  error,
  isPending,
  locationSlug,
  onSubmit,
  row,
  open,
}: {
  error: unknown;
  isPending: boolean;
  locationSlug: string;
  onSubmit: (req: AdminStockCountRequest) => void;
  row: AdminStockBalanceSummary | null;
  open: boolean;
}) {
  const productSelectId = useId();
  const variantSelectId = useId();
  const qtyInputId = useId();
  const [productSlug, setProductSlug] = useState("");
  const [variantSku, setVariantSku] = useState("");
  const [qty, setQty] = useState("");

  const productsQuery = useQuery({
    enabled: open && !row,
    queryFn: () => fetchAdminProducts(PRODUCTS_QUERY),
    queryKey: adminProductsQueryKey(PRODUCTS_QUERY),
    staleTime: 60_000,
  });

  const productQuery = useQuery({
    enabled: !!productSlug,
    queryFn: () => fetchAdminProduct(productSlug),
    queryKey: adminProductQueryKey(productSlug),
    staleTime: 30_000,
  });

  const activeVariants = (productQuery.data?.variants ?? []).filter(
    (v) => v.status === "active",
  );

  function handleProductChange(slug: string) {
    setProductSlug(slug);
    setVariantSku("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseInt(qty, 10);
    if (Number.isNaN(parsed) || parsed < 0) return;
    const sku = row ? row.sku : variantSku;
    if (!sku) return;
    onSubmit({ locationSlug, onHandQuantity: parsed, sku });
  }

  const parsedQty = Number.parseInt(qty, 10);
  const isValid = !Number.isNaN(parsedQty) && parsedQty >= 0;
  const belowReserved =
    isValid && row != null && parsedQty < row.reservedQuantity;
  const canSubmit =
    isValid && !belowReserved && !isPending && (row ? true : !!variantSku);

  const errorMessage =
    error instanceof Error
      ? error.message
      : error
        ? "Failed to save stock count."
        : null;

  return (
    <form
      className="flex flex-col gap-4"
      id="count-form"
      onSubmit={handleSubmit}
    >
      {!row ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={productSelectId}>Product</Label>
            <Select onValueChange={handleProductChange} value={productSlug}>
              <SelectTrigger id={productSelectId}>
                <SelectValue
                  placeholder={
                    productsQuery.isPending
                      ? "Loading products…"
                      : "Select a product"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {productsQuery.data?.items.map((p) => (
                  <SelectItem key={p.slug} value={p.slug}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={variantSelectId}>Variant / SKU</Label>
            <Select
              disabled={!productSlug}
              onValueChange={setVariantSku}
              value={variantSku}
            >
              <SelectTrigger id={variantSelectId}>
                <SelectValue
                  placeholder={
                    productQuery.isPending
                      ? "Loading variants…"
                      : "Select a variant"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {activeVariants.map((v) => (
                  <SelectItem key={v.slug} value={v.sku}>
                    {v.name} — {v.sku}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={qtyInputId}>On-hand quantity</Label>
        <Input
          id={qtyInputId}
          min={0}
          onChange={(e) => setQty(e.target.value)}
          placeholder="0"
          required
          type="number"
          value={qty}
        />
      </div>

      {belowReserved ? (
        <p className="rounded-md border border-warning/40 bg-warning/5 p-2 text-xs text-warning">
          This quantity is below the reserved amount ({row?.reservedQuantity}).
          Available stock would go negative.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="hidden">
        <Button id="submit-button" disabled={!canSubmit} type="submit" />
      </div>
    </form>
  );
}
