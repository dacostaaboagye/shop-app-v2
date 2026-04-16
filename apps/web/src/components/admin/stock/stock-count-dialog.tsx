"use client";

import type {
  AdminStockBalanceSummary,
  AdminStockCountRequest,
} from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

type Props = {
  error: unknown;
  isPending: boolean;
  locationName: string;
  locationSlug: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (req: AdminStockCountRequest) => void;
  open: boolean;
  /** Pre-filled when opened from an existing balance row; null for a fresh count. */
  row: AdminStockBalanceSummary | null;
};

export function StockCountDialog({
  error,
  isPending,
  locationName,
  locationSlug,
  onOpenChange,
  onSubmit,
  open,
  row,
}: Props) {
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

  function handleOpenChange(next: boolean) {
    if (!next) {
      setProductSlug("");
      setVariantSku("");
      setQty("");
    }
    onOpenChange(next);
  }

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

  const parsed = Number.parseInt(qty, 10);
  const isValid = !Number.isNaN(parsed) && parsed >= 0;
  const belowReserved = isValid && row != null && parsed < row.reservedQuantity;
  const errorMessage =
    error instanceof Error
      ? error.message
      : error
        ? "Failed to save stock count."
        : null;
  const activeVariants = (productQuery.data?.variants ?? []).filter(
    (v) => v.status === "active",
  );
  const canSubmit =
    isValid && !belowReserved && !isPending && (row ? true : !!variantSku);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Count stock</DialogTitle>
          <DialogDescription>
            {row
              ? `Set the on-hand quantity for ${row.productName} — ${row.variantName} (${row.sku}) at ${locationName}.`
              : `Select a product and variant to count at ${locationName}.`}
          </DialogDescription>
        </DialogHeader>

        {row ? (
          <dl className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">On hand</dt>
              <dd className="tabular-nums font-medium">{row.onHandQuantity}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Reserved</dt>
              <dd className="tabular-nums font-medium">
                {row.reservedQuantity}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Available</dt>
              <dd className="tabular-nums font-medium">
                {row.availableQuantity}
              </dd>
            </div>
          </dl>
        ) : null}

        <form
          className="flex flex-col gap-4"
          id="count-form"
          onSubmit={handleSubmit}
        >
          {!row ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={productSelectId}>Product</Label>
                <Select
                  id={productSelectId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  required
                  value={productSlug}
                >
                  <option value="">
                    {productsQuery.isPending
                      ? "Loading products…"
                      : "Select a product"}
                  </option>
                  {productsQuery.data?.items.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={variantSelectId}>Variant / SKU</Label>
                <Select
                  disabled={!productSlug}
                  id={variantSelectId}
                  onChange={(e) => setVariantSku(e.target.value)}
                  required
                  value={variantSku}
                >
                  <option value="">
                    {productQuery.isPending
                      ? "Loading variants…"
                      : "Select a variant"}
                  </option>
                  {activeVariants.map((v) => (
                    <option key={v.slug} value={v.sku}>
                      {v.name} — {v.sku}
                    </option>
                  ))}
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
              This quantity is below the reserved amount (
              {row?.reservedQuantity}). Available stock would go negative.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button disabled={!canSubmit} form="count-form" type="submit">
            {isPending ? "Saving…" : "Save count"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
