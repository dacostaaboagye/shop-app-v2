"use client";

import type { VariantSearchResult } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money/format-money";
import {
  fetchManagerVariants,
  variantSearchQueryKey,
} from "@/lib/react-query/catalog-variants";
import type { ManualInvoiceDraftLine } from "./manual-invoice-request-create.support";
import { createDraftLine } from "./manual-invoice-request-create.support";

export function ManagerManualInvoiceRequestLinePicker({
  lines,
  locationId,
  onChange,
}: {
  lines: ManualInvoiceDraftLine[];
  locationId: string;
  onChange: (lines: ManualInvoiceDraftLine[]) => void;
}) {
  const [search, setSearch] = useState("");
  const variantsQuery = useQuery({
    enabled: !!locationId,
    queryFn: () =>
      fetchManagerVariants({ locationId, page: 1, pageSize: 8, q: search }),
    queryKey: variantSearchQueryKey({
      locationId,
      page: 1,
      pageSize: 8,
      q: search,
    }),
    staleTime: 30_000,
  });
  const selectedSkus = new Set(lines.map((line) => line.skuId));

  function addVariant(variant: VariantSearchResult) {
    if (selectedSkus.has(variant.variantId)) return;
    onChange([...lines, createDraftLine(variant)]);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="type-data-label" htmlFor="manual-line-search">
          Add products
        </label>
        <Input
          id="manual-line-search"
          placeholder="Search SKU, product, or variant"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-card">
        {(variantsQuery.data?.items ?? []).map((variant) => (
          <div
            className="flex flex-col gap-3 border-b border-border/60 p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            key={variant.variantId}
          >
            <VariantSummary variant={variant} />
            <Button
              disabled={selectedSkus.has(variant.variantId)}
              onClick={() => addVariant(variant)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus data-icon="inline-start" />
              {selectedSkus.has(variant.variantId) ? "Added" : "Add"}
            </Button>
          </div>
        ))}
        {!variantsQuery.isPending &&
        (variantsQuery.data?.items.length ?? 0) === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No variants match this search.
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Invoice request lines
          </h3>
          <p className="type-support mt-1">
            These lines stay pending until an approver issues the invoice.
          </p>
        </div>
        {lines.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Add at least one product line.
          </p>
        ) : (
          lines.map((line) => (
            <div
              className="grid gap-3 border-b border-border/60 p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_100px_130px_44px]"
              key={line.skuId}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {line.title}
                </p>
                <p className="type-identifier mt-1">{line.sku}</p>
              </div>
              <Input
                min={1}
                placeholder="Qty"
                type="number"
                value={line.quantity}
                onChange={(event) =>
                  updateLine(lines, onChange, line.skuId, {
                    quantity: event.target.value,
                  })
                }
              />
              <Input
                inputMode="decimal"
                placeholder="Unit price"
                value={line.unitPrice}
                onChange={(event) =>
                  updateLine(lines, onChange, line.skuId, {
                    unitPrice: event.target.value,
                  })
                }
              />
              <Button
                aria-label={`Remove ${line.sku}`}
                onClick={() =>
                  onChange(lines.filter((item) => item.skuId !== line.skuId))
                }
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function VariantSummary({ variant }: { variant: VariantSearchResult }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">
        {variant.productName} - {variant.name}
      </p>
      <p className="type-support">
        {variant.sku} - {formatMoney(variant.sellingPrice)}
      </p>
    </div>
  );
}

function updateLine(
  lines: ManualInvoiceDraftLine[],
  onChange: (lines: ManualInvoiceDraftLine[]) => void,
  skuId: string,
  patch: Partial<ManualInvoiceDraftLine>,
) {
  onChange(
    lines.map((line) => (line.skuId === skuId ? { ...line, ...patch } : line)),
  );
}
