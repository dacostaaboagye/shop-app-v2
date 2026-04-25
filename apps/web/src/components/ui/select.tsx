"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import type * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getSelectItemLabel,
  SelectLabelContext,
  type SelectLabelContextValue,
  type SelectRootProps,
} from "./select.support";
import {
  SelectContent,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
} from "./select-popup";

function Select(props: SelectRootProps) {
  const { defaultValue, onValueChange, value, ...rootProps } = props;
  const [itemLabels, setItemLabels] = useState<Record<string, React.ReactNode>>(
    {},
  );
  const [uncontrolledValue, setUncontrolledValue] = useState<string | null>(
    typeof defaultValue === "string" ? defaultValue : null,
  );
  const selectedValue = typeof value === "string" ? value : uncontrolledValue;
  const contextValue = useMemo<SelectLabelContextValue>(
    () => ({
      registerItem: (itemValue, label) => {
        setItemLabels((current) => {
          if (current[itemValue] === label) {
            return current;
          }

          return {
            ...current,
            [itemValue]: label,
          };
        });
      },
      unregisterItem: (itemValue) => {
        setItemLabels((current) => {
          if (!(itemValue in current)) {
            return current;
          }

          const next = { ...current };
          delete next[itemValue];
          return next;
        });
      },
      value: selectedValue,
    }),
    [selectedValue],
  );

  return (
    <SelectLabelContext.Provider value={contextValue}>
      <SelectPrimitive.Root
        {...rootProps}
        defaultValue={defaultValue}
        value={value}
        items={
          Object.keys(itemLabels).length > 0
            ? Object.entries(itemLabels).map(([itemValue, label]) => ({
                label,
                value: itemValue,
              }))
            : undefined
        }
        onValueChange={(nextValue) => {
          if (typeof value !== "string") {
            setUncontrolledValue(
              typeof nextValue === "string" ? nextValue : null,
            );
          }

          if (typeof nextValue === "string") {
            onValueChange?.(nextValue);
          }
        }}
      />
    </SelectLabelContext.Provider>
  );
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  );
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn(
        "flex min-w-0 flex-1 text-left [overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 py-2 pr-2 pl-3 text-sm font-medium transition-all outline-none select-none hover:bg-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground data-[size=default]:min-h-11 data-[size=sm]:h-8 *:data-[slot=select-value]:flex *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 *:data-[slot=select-value]:pr-2 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-3.5 text-muted-foreground opacity-60" />
        }
      />
    </SelectPrimitive.Trigger>
  );
}

function SelectItem({
  className,
  children,
  label,
  value,
  ...props
}: SelectPrimitive.Item.Props) {
  const context = useContext(SelectLabelContext);
  const itemLabel = label ?? getSelectItemLabel(children);

  useEffect(() => {
    if (!context || !itemLabel || typeof value !== "string") {
      return;
    }

    context.registerItem(value, itemLabel);

    return () => {
      context.unregisterItem(value);
    };
  }, [context, itemLabel, value]);

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[selected]:bg-primary/[0.04] data-[selected]:text-primary data-[selected]:font-medium data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      label={label}
      value={value}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 items-center gap-2">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-3 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="size-3.5 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
