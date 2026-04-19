"use client";

import type { CurrentAssignment, InvoiceResponse, PosPaymentMethod } from "@shop/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { postWorkerSale } from "@/lib/react-query/pos-sales";
import {
  fetchWorkerAssignments,
  workerAssignmentsQueryKey,
} from "@/lib/react-query/worker-assignments";
import { CartBody, type CartItem, PosSaleCartCard } from "./pos-sale-cart-card";
import {
  SaleSuccessPanel,
  VariantRow,
} from "./pos-sale-page-sections";

type SaleSuccess = {
  invoice: InvoiceResponse;
};

export function PosSalePageClient() {
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
  const [success, setSuccess] = useState<SaleSuccess | null>(null);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  const assignmentsQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: async () => {
      if (!selectedLocationScope) throw new Error("A sales location is required.");
      return fetchWorkerAssignments(selectedLocationScope.locationId);
    },
    queryKey: workerAssignmentsQueryKey(selectedLocationScope?.locationId ?? ""),
    staleTime: 30_000,
  });

  const saleMutation = useMutation({
    mutationFn: postWorkerSale,
    onSuccess: (invoice) => {
      setSuccess({ invoice });
      setCart([]);
      setNotes("");
      setCartSheetOpen(false);
    },
  });

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const price = parseFloat(item.unitPrice);
        return sum + (isNaN(price) ? 0 : price * item.quantity);
      }, 0),
    [cart],
  );

  function addToCart(assignment: CurrentAssignment) {
    setCart((prev) => {
      const existing = prev.find((item) => item.assignment.skuId === assignment.skuId);
      if (existing) {
        return prev.map((item) =>
          item.assignment.skuId === assignment.skuId
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, item.assignment.availableQuantity),
              }
            : item,
        );
      }
      return [...prev, { assignment, quantity: 1, unitPrice: assignment.sellingPrice }];
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
                  Math.min(item.quantity + delta, item.assignment.availableQuantity),
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
    error: saleMutation.error,
    isPending: saleMutation.isPending,
    notes,
    onConfirm: handleConfirm,
    onNotesChange: setNotes,
    onPaymentMethodChange: setPaymentMethod,
    onPriceChange: updatePrice,
    onRemove: removeFromCart,
    onUpdate: updateQty,
    paymentMethod,
  };

  const assignments = assignmentsQuery.data?.items ?? [];

  return (
    <PageShell>
      <PageHeader
        description="Select assigned variants, set quantities, and process a sale."
        title="New sale"
      />

      {success ? (
        <SaleSuccessPanel
          invoice={success.invoice}
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

          {assignmentsQuery.isPending && selectedLocationScope ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-14 w-full" />
              ))}
            </div>
          ) : assignmentsQuery.isError ? (
            <AppErrorBanner
              detail="Could not load your assigned variants."
              error={assignmentsQuery.error}
              onRetry={() => void assignmentsQuery.refetch()}
              title="Unable to load variants"
            />
          ) : selectedLocationScope && assignments.length > 0 ? (
            <>
              {/* Layout: single column on mobile, two columns on desktop */}
              <div className="pb-24 lg:pb-0">
                <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
                  {/* Variant list */}
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Your assigned variants
                    </p>
                    <div className="divide-y divide-border rounded-md border border-border bg-card">
                      {assignments.map((assignment) => (
                        <VariantRow
                          key={assignment.skuId}
                          assignment={assignment}
                          cartQuantity={
                            cart.find((i) => i.assignment.skuId === assignment.skuId)
                              ?.quantity ?? 0
                          }
                          inCart={cart.some(
                            (item) => item.assignment.skuId === assignment.skuId,
                          )}
                          onAdd={() => addToCart(assignment)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Desktop cart — hidden on mobile */}
                  <div className="hidden lg:block">
                    <PosSaleCartCard {...cartProps} />
                  </div>
                </div>
              </div>

              {/* Mobile sticky bottom bar */}
              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-3 shadow-lg lg:hidden">
                {cart.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Tap a variant to add it to your cart
                  </p>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {cart.reduce((n, i) => n + i.quantity, 0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none">
                          {cart.length} item{cart.length !== 1 ? "s" : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                          Total: {cartTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => setCartSheetOpen(true)} size="sm">
                      <ShoppingCart className="mr-1.5 size-3.5" />
                      Review &amp; Pay
                    </Button>
                  </div>
                )}
              </div>

              {/* Mobile cart sheet */}
              <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
                <SheetContent side="bottom" className="max-h-[88svh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <ShoppingCart className="size-4" />
                      Cart
                      {cart.length > 0 && (
                        <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                          {cart.length}
                        </span>
                      )}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-8">
                    <CartBody {...cartProps} />
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : selectedLocationScope && !assignmentsQuery.isPending ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No variants are currently assigned to you at this location.
            </div>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
