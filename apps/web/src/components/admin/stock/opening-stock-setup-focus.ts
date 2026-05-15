import type { VariantSearchResult } from "@shop/contracts";
import { useEffect, useRef } from "react";

export function useOpeningStockSelectionFocus(
  selectedProduct: VariantSearchResult | null,
) {
  const selectedPanelRef = useRef<HTMLDivElement | null>(null);
  const quantityInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedProduct) return;
    window.requestAnimationFrame(() => {
      selectedPanelRef.current?.scrollIntoView({ block: "start" });
      quantityInputRef.current?.focus({ preventScroll: true });
    });
  }, [selectedProduct]);

  return { quantityInputRef, selectedPanelRef };
}
