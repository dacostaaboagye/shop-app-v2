"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/display/format";

export function SaleAssignmentMatchNotice({
  recentlyAdded,
  search,
  searchMatchState,
}: {
  recentlyAdded: { quantity: number; skuId: string } | null;
  search: string;
  searchMatchState: {
    assignment: CurrentAssignment;
    kind: "exact_sku" | "prefix_sku";
  } | null;
}) {
  if (searchMatchState) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
        <Badge className="rounded-lg border-none bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shadow-none">
          {searchMatchState.kind === "exact_sku"
            ? "Exact SKU match"
            : "Closest SKU match"}
        </Badge>
        <p className="text-sm font-medium text-foreground">
          {searchMatchState.assignment.sku}
        </p>
        <p className="type-support">
          {searchMatchState.assignment.productName}
        </p>
        <Badge
          className={
            searchMatchState.assignment.availableQuantity > 0
              ? "rounded-lg border-none bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground shadow-none"
              : "rounded-lg border-none bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-none"
          }
        >
          {searchMatchState.assignment.availableQuantity > 0
            ? `${formatCount(searchMatchState.assignment.availableQuantity)} available`
            : "Out of stock"}
        </Badge>
        {recentlyAdded?.skuId === searchMatchState.assignment.skuId ? (
          <Badge className="rounded-lg border-none bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground shadow-none">
            Added. {formatCount(recentlyAdded.quantity)} now in cart
          </Badge>
        ) : null}
      </div>
    );
  }

  if (search.trim()) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-3 py-2">
        <Badge className="rounded-lg border-none bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-none">
          No SKU match
        </Badge>
        <p className="text-sm font-medium text-foreground">{search.trim()}</p>
        <p className="type-support">
          No assigned variant matches this scan at the current location.
        </p>
      </div>
    );
  }

  return null;
}
