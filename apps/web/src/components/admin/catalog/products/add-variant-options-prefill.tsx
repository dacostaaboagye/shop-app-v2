"use client";

import type { AdminProductOption } from "@shop/contracts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  onApply: (name: string, sku: string) => void;
  options: AdminProductOption[];
  productSlug: string;
};

function buildSku(slug: string, parts: string[]): string {
  const prefix = slug
    .split("-")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const suffix = parts
    .map((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .join("-");
  return suffix ? `${prefix}-${suffix}` : prefix;
}

export function OptionsPrefill({ onApply, options, productSlug }: Props) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const parts = options
    .map((o) => selections[o.optionId])
    .filter(Boolean) as string[];

  return (
    <div className="rounded-md border border-dashed border-border p-3">
      <p className="mb-2 text-xs text-muted-foreground">
        Pre-fill variant name from options:
      </p>
      <div className="flex flex-wrap items-end gap-2">
        {options.map((opt) => (
          <div key={opt.optionId} className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{opt.name}</p>
            <Select
              onValueChange={(val) =>
                setSelections((s) => ({
                  ...s,
                  [opt.optionId]: val === "none" ? "" : val,
                }))
              }
              value={selections[opt.optionId] || "none"}
            >
              <SelectTrigger className="h-8 min-w-[80px]">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {opt.values.map((v) => (
                  <SelectItem key={v.valueId} value={v.value}>
                    {v.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {parts.length > 0 ? (
          <Button
            onClick={() =>
              onApply(parts.join(" / "), buildSku(productSlug, parts))
            }
            size="sm"
            type="button"
            variant="secondary"
          >
            Use &ldquo;{parts.join(" / ")}&rdquo;
          </Button>
        ) : null}
      </div>
    </div>
  );
}
