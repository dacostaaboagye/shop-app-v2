import type { CurrentAssignment } from "@shop/contracts";
import type { CartItem } from "./pos-sale-cart-card";

export function addCartAssignment(
  cart: CartItem[],
  assignment: CurrentAssignment,
): CartItem[] {
  const existing = cart.find(
    (item) => item.assignment.skuId === assignment.skuId,
  );

  if (existing) {
    return cart.map((item) =>
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
    ...cart,
    { assignment, quantity: 1, unitPrice: assignment.sellingPrice },
  ];
}

export function removeCartAssignment(cart: CartItem[], skuId: string) {
  return cart.filter((item) => item.assignment.skuId !== skuId);
}

export function updateCartAssignmentPrice(
  cart: CartItem[],
  skuId: string,
  unitPrice: string,
) {
  return cart.map((item) =>
    item.assignment.skuId === skuId ? { ...item, unitPrice } : item,
  );
}

export function updateCartAssignmentQuantity(
  cart: CartItem[],
  skuId: string,
  delta: number,
) {
  return cart
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
    .filter((item) => item.quantity > 0);
}
