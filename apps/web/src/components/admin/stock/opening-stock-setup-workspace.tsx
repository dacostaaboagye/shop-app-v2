"use client";

import type {
  AdminOpeningStockRequest,
  VariantSearchResult,
} from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { openingVariantSearchQueryKey } from "@/lib/react-query/catalog-variants";
import { OpeningStockProductPicker } from "./opening-stock-product-picker";
import { OpeningStockRowReview } from "./opening-stock-row-review";
import { OpeningStockSelectedProductForm } from "./opening-stock-selected-product-form";
import {
  buildOpeningStockRequest,
  canAppendOpeningStockRow,
  getOpeningStockReadyRows,
  getOpeningStockServerBlockedRowCount,
  getOpeningStockServerRowErrors,
  hasOpeningStockDraft,
  isOpeningStockSkuInRows,
  MAX_OPENING_STOCK_ROWS,
  type OpeningStockFormValues,
  parseOpeningStockRows,
  removeOpeningStockRow,
  upsertOpeningStockRow,
} from "./opening-stock-setup.support";
import { OpeningStockSetupBanners } from "./opening-stock-setup-banners";
import {
  OpeningStockAuditFields,
  OpeningStockPasteSection,
} from "./opening-stock-setup-fields";
import { useOpeningStockSelectionFocus } from "./opening-stock-setup-focus";
import { OpeningStockSetupHeader } from "./opening-stock-setup-header";
import {
  buildOpeningVariantQuery,
  fetchOpeningStockProducts,
  type OpeningStockLookup,
} from "./opening-stock-setup-query";

type Props = {
  error: unknown;
  isPending: boolean;
  lookup: OpeningStockLookup;
  locationName: string;
  locationSlug: string;
  onSubmit: (request: AdminOpeningStockRequest) => void;
  successMessage?: string | null;
};

export function OpeningStockSetupWorkspace({
  error,
  isPending,
  lookup,
  locationName,
  locationSlug,
  onSubmit,
  successMessage = null,
}: Props) {
  const [productSearchDraft, setProductSearchDraft] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<VariantSearchResult | null>(null);
  const { quantityInputRef, selectedPanelRef } =
    useOpeningStockSelectionFocus(selectedProduct);
  const productLookupInput = buildOpeningVariantQuery(lookup, productSearch);
  const productLookupQuery = useQuery({
    enabled:
      lookup.type === "admin"
        ? lookup.locationSlug.length > 0
        : lookup.locationId.length > 0,
    queryFn: () => fetchOpeningStockProducts(productLookupInput),
    queryKey: openingVariantSearchQueryKey(productLookupInput),
    staleTime: 30_000,
  });
  const form = useForm({
    defaultValues: {
      note: "",
      quantityEntry: "",
      rawRows: "",
      skuEntry: "",
      sourceReference: "",
      sourceType: "physical_count",
    } as OpeningStockFormValues,
    onSubmit: async ({ value }) => {
      const rows = parseOpeningStockRows(value.rawRows);
      const readyRows = getOpeningStockReadyRows(rows);
      const blockedCount = rows.length - readyRows.length;
      if (
        rows.length === 0 ||
        rows.length > MAX_OPENING_STOCK_ROWS ||
        blockedCount > 0 ||
        hasOpeningStockDraft({
          quantity: value.quantityEntry,
          sku: value.skuEntry,
        })
      ) {
        return;
      }

      onSubmit(
        buildOpeningStockRequest({
          locationSlug,
          note: value.note,
          rows: readyRows,
          sourceReference: value.sourceReference,
          sourceType: value.sourceType,
        }),
      );
    },
  });

  return (
    <form.Subscribe selector={(state) => state.values}>
      {(values) => {
        const rows = parseOpeningStockRows(values.rawRows);
        const readyRows = getOpeningStockReadyRows(rows);
        const serverErrors = getOpeningStockServerRowErrors(error);
        const reviewedSkus = new Set(rows.map((row) => row.sku.toUpperCase()));
        const serverBlockedCount = getOpeningStockServerBlockedRowCount({
          rows,
          serverErrors,
        });
        const blockedCount = rows.length - readyRows.length;
        const overLimit = rows.length > MAX_OPENING_STOCK_ROWS;
        const hasDraft = hasOpeningStockDraft({
          quantity: values.quantityEntry,
          sku: values.skuEntry,
        });
        const canAddSelectedProduct =
          selectedProduct !== null &&
          selectedProduct.openingStockStatus !== "initialized" &&
          canAppendOpeningStockRow({
            quantity: values.quantityEntry,
            sku: selectedProduct.sku,
          });
        const selectedProductOpeningBlocked =
          selectedProduct?.openingStockStatus === "initialized";
        const selectedProductIsInReview =
          selectedProduct !== null &&
          isOpeningStockSkuInRows({ rows, sku: selectedProduct.sku });
        const canSubmit =
          rows.length > 0 &&
          blockedCount === 0 &&
          serverBlockedCount === 0 &&
          !overLimit &&
          !hasDraft &&
          !isPending;

        return (
          <Card className="overflow-hidden rounded-xl border-border/60 shadow-sm">
            <OpeningStockSetupHeader
              blockedCount={blockedCount}
              locationName={locationName}
              readyCount={readyRows.length}
            />
            <CardContent className="grid gap-4 p-4 xl:grid-cols-[minmax(280px,400px)_1fr]">
              <div>
                <OpeningStockProductPicker
                  error={productLookupQuery.error}
                  isFetching={productLookupQuery.isFetching}
                  items={productLookupQuery.data?.items ?? []}
                  onRetry={() => void productLookupQuery.refetch()}
                  onSearchChange={setProductSearchDraft}
                  onSearchSubmit={() => {
                    setProductSearch(productSearchDraft.trim());
                  }}
                  onSelect={(item) => {
                    setSelectedProduct(item);
                    form.setFieldValue("skuEntry", item.sku);
                    form.setFieldValue(
                      "quantityEntry",
                      String(Math.max(0, item.onHandQuantity)),
                    );
                  }}
                  query={productSearchDraft}
                  reviewedSkus={reviewedSkus}
                  selectedSku={selectedProduct?.sku ?? null}
                  submittedQuery={productSearch}
                  totalCount={productLookupQuery.data?.total ?? 0}
                />
              </div>
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void form.handleSubmit();
                }}
              >
                <OpeningStockSelectedProductForm
                  canAdd={canAddSelectedProduct}
                  form={form}
                  isOpeningBlocked={selectedProductOpeningBlocked}
                  isInReview={selectedProductIsInReview}
                  onAdd={() => {
                    if (!selectedProduct) return;
                    const nextRows = upsertOpeningStockRow({
                      currentRows: values.rawRows,
                      quantity: values.quantityEntry,
                      sku: selectedProduct.sku,
                    });
                    if (nextRows === values.rawRows) return;

                    form.setFieldValue("rawRows", nextRows);
                    form.setFieldValue("skuEntry", "");
                    form.setFieldValue("quantityEntry", "");
                    setSelectedProduct(null);
                  }}
                  panelRef={selectedPanelRef}
                  quantityInputRef={quantityInputRef}
                  selectedProduct={selectedProduct}
                />
                <OpeningStockPasteSection form={form} />
                <OpeningStockAuditFields form={form} />

                <OpeningStockRowReview
                  onRemoveRow={(index) => {
                    form.setFieldValue(
                      "rawRows",
                      removeOpeningStockRow({ index, rows }),
                    );
                  }}
                  rows={rows}
                  serverErrors={serverErrors}
                />

                <OpeningStockSetupBanners
                  error={error}
                  hasDraft={hasDraft}
                  overLimit={overLimit}
                  rowsLength={rows.length}
                  serverBlockedCount={serverBlockedCount}
                  successMessage={successMessage}
                />

                <Button disabled={!canSubmit} type="submit">
                  {isPending ? "Saving..." : "Save opening stock"}
                </Button>
              </form>
            </CardContent>
          </Card>
        );
      }}
    </form.Subscribe>
  );
}
