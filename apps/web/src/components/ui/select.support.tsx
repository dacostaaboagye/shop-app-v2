"use client";

import type { Select as SelectPrimitive } from "@base-ui/react/select";
import type * as React from "react";
import { Children, createContext, isValidElement } from "react";

export type SelectRootProps = Omit<
  React.ComponentProps<typeof SelectPrimitive.Root>,
  "onValueChange"
> & {
  onValueChange?: (value: string) => void;
};

export type SelectLabelContextValue = {
  registerItem: (value: string, label: string) => void;
  unregisterItem: (value: string) => void;
  value: string | null;
};

export const SelectLabelContext = createContext<SelectLabelContextValue | null>(
  null,
);

export function getSelectItemLabel(children: React.ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      if (isValidElement<{ children?: React.ReactNode }>(child)) {
        return getSelectItemLabel(child.props.children);
      }

      return "";
    })
    .join(" ")
    .trim();
}
