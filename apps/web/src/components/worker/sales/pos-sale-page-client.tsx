"use client";

import type {
  CurrentAssignment,
  InvoiceResponse,
  PosPaymentMethod,
} from "@shop/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import { postWorkerSale } from "@/lib/react-query/pos-sales";
import {
  fetchWorkerAssignments,
  workerAssignmentsQueryKey,
} from "@/lib/react-query/worker-assignments";
import {
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import { PosSaleAssignmentWorkspace } from "./pos-sale-assignment-workspace";
import {
  POS_SALE_PAGE_SIZE_OPTIONS,
  POS_SALE_QUICK_FILTERS,
  POS_SALE_SORT_OPTIONS,
} from "./pos-sale-assignment-workspace.support";
import type { CartItem } from "./pos-sale-cart-card";
import {
  createEmptyPosSaleCustomerDetails,
  normalizePosSaleCustomerDetails,
} from "./pos-sale-customer-details.support";
import { replacePosSaleQuery } from "./pos-sale-page-query.support";
import { SaleSuccessPanel } from "./pos-sale-success-panel";

type SaleSuccess = {
  invoice: InvoiceResponse;
};

export function PosSalePageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const brandSlug = readStringParam(searchParams, "brand");
  const categorySlug = readStringParam(searchParams, "category");
  const quickFilter = readEnumParam(
    searchParams,
    "view",
    POS_SALE_QUICK_FILTERS,
    "all",
  );
  const sort = readEnumParam(
    searchParams,
    "sort",
    POS_SALE_SORT_OPTIONS,
    "name",
  );
  const querySearch = readStringParam(searchParams, "q");
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 24);
  const pageSize = POS_SALE_PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof POS_SALE_PAGE_SIZE_OPTIONS)[number],
  )
    ? rawPageSize
    : 24;
  const page = readPositiveIntParam(searchParams, "page", 1);
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("pos.sales.process");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [customerDetails, setCustomerDetails] = useState(
    createEmptyPosSaleCustomerDetails(),
  );
  const [success, setSuccess] = useState<SaleSuccess | null>(null);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  useEffect(() => {
    setDraftSearch(querySearch);
  }, [querySearch]);

  useEffect(() => {
    if (draftSearch === querySearch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      replacePosSaleQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [draftSearch, pathname, querySearch, router, searchParams]);

  const assignmentsQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: async () => {
      if (!selectedLocationScope) {
        throw new Error("A sales location is required.");
      }
      return fetchWorkerAssignments(selectedLocationScope.locationId);
    },
    queryKey: workerAssignmentsQueryKey(
      selectedLocationScope?.locationId ?? "",
    ),
    staleTime: 30_000,
  });
  const profileQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () =>
      fetchOfficialDocumentProfile(selectedLocationScope?.locationId),
    queryKey: officialDocumentProfileQueryKey(
      selectedLocationScope?.locationId,
    ),
    staleTime: 5 * 60_000,
  });
  const moneyProfile = profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;

  const saleMutation = useMutation({
    mutationFn: postWorkerSale,
    onSuccess: (invoice) => {
      setSuccess({ invoice });
      setCart([]);
      setCustomerDetails(createEmptyPosSaleCustomerDetails());
      setNotes("");
      setCartSheetOpen(false);
    },
  });

  function addToCart(assignment: CurrentAssignment) {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.assignment.skuId === assignment.skuId,
      );
      if (existing) {
        return prev.map((item) =>
          item.assignment.skuId === assignment.skuId
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + 1,
                  item.assignment.availableQuantity,
                ),
              }
            : item,
        );
      }
      return [
        ...prev,
        { assignment, quantity: 1, unitPrice: assignment.sellingPrice },
      ];
    });
  }

  function updateQty(skuId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.assignment.skuId === skuId
            ? {
                ...item,
                quantity: Math.max(
                  0,
                  Math.min(
                    item.quantity + delta,
                    item.assignment.availableQuantity,
                  ),
                ),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function updatePrice(skuId: string, unitPrice: string) {
    setCart((prev) =>
      prev.map((item) =>
        item.assignment.skuId === skuId ? { ...item, unitPrice } : item,
      ),
    );
  }

  function removeFromCart(skuId: string) {
    setCart((prev) => prev.filter((item) => item.assignment.skuId !== skuId));
  }

  function handleConfirm() {
    if (!selectedLocationScope || cart.length === 0) return;
    saleMutation.mutate({
      ...normalizePosSaleCustomerDetails(customerDetails),
      lines: cart.map((item) => ({
        quantity: item.quantity,
        skuId: item.assignment.skuId,
        unitPrice: item.unitPrice,
      })),
      locationId: selectedLocationScope.locationId,
      paymentMethod,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  }

  const cartProps = {
    cart,
    customerDetails,
    error: saleMutation.error,
    isPending: saleMutation.isPending,
    moneyProfile,
    notes,
    onConfirm: handleConfirm,
    onCustomerDetailsChange: setCustomerDetails,
    onNotesChange: setNotes,
    onPaymentMethodChange: setPaymentMethod,
    onPriceChange: updatePrice,
    onRemove: removeFromCart,
    onUpdate: updateQty,
    paymentMethod,
  };

  return (
    <PageShell>
      <PageHeader
        description="Select assigned variants, adjust quantities or pricing where needed, and complete the sale."
        title="New sale"
      />

      {success ? (
        <SaleSuccessPanel
          invoice={success.invoice}
          moneyProfile={moneyProfile}
          onNewSale={() => setSuccess(null)}
        />
      ) : (
        <>
          <LocationScopePanel
            description="Sale processing uses the location scope already attached to your worker access."
            emptyDescription="No assigned location is available for POS sales."
            isLoading={isLoading}
            locationScopes={accessibleLocationScopes}
            onLocationChange={(locationSlug) => {
              setSelectedLocationSlug(locationSlug);
              setCart([]);
              setSuccess(null);
            }}
            selectedLocationSlug={selectedLocationSlug}
            title="Sales location"
          />
          <PosSaleAssignmentWorkspace
            assignments={assignmentsQuery.data?.items ?? []}
            brandSlug={brandSlug}
            categorySlug={categorySlug}
            cart={cart}
            cartProps={cartProps}
            cartSheetOpen={cartSheetOpen}
            error={assignmentsQuery.error}
            isError={assignmentsQuery.isError}
            isPending={assignmentsQuery.isPending}
            moneyProfile={moneyProfile}
            onAddToCart={addToCart}
            onBrandChange={(value) =>
              replacePosSaleQuery(router, pathname, searchParams, {
                brand: value || null,
                page: null,
              })
            }
            onCategoryChange={(value) =>
              replacePosSaleQuery(router, pathname, searchParams, {
                category: value || null,
                page: null,
              })
            }
            onClearFilters={() =>
              replacePosSaleQuery(router, pathname, searchParams, {
                brand: null,
                category: null,
                page: null,
                pageSize: null,
                q: null,
                sort: null,
                view: null,
              })
            }
            onPageChange={(nextPage) =>
              replacePosSaleQuery(router, pathname, searchParams, {
                page: nextPage === 1 ? null : nextPage,
              })
            }
            onPageSizeChange={(nextPageSize) =>
              replacePosSaleQuery(router, pathname, searchParams, {
                page: null,
                pageSize: nextPageSize === 24 ? null : nextPageSize,
              })
            }
            onQuickFilterChange={(value) =>
              replacePosSaleQuery(router, pathname, searchParams, {
                page: null,
                view: value === "all" ? null : value,
              })
            }
            onRetry={() => void assignmentsQuery.refetch()}
            onSearchChange={setDraftSearch}
            onSortChange={(value) =>
              replacePosSaleQuery(router, pathname, searchParams, {
                page: null,
                sort: value === "name" ? null : value,
              })
            }
            page={page}
            pageSize={pageSize}
            pageSizeOptions={POS_SALE_PAGE_SIZE_OPTIONS}
            quickFilter={quickFilter}
            search={draftSearch}
            selectedLocationScope={selectedLocationScope}
            setCartSheetOpen={setCartSheetOpen}
            sort={sort}
          />
        </>
      )}
    </PageShell>
  );
}
