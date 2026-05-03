"use client";

import type { AdminProductOption, AdminVariantSummary } from "@shop/contracts";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddVariantForm } from "./add-variant-form";
import { VariantRow } from "./variant-row";

type VariantsPanelProps = {
  canManage: boolean;
  canSeeCostPrice: boolean;
  canViewHistory: boolean;
  options: AdminProductOption[];
  productSlug: string;
  variants: AdminVariantSummary[];
};

export function VariantsPanel({
  canManage,
  canSeeCostPrice,
  canViewHistory,
  options,
  productSlug,
  variants,
}: VariantsPanelProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Variants</CardTitle>
          <CardDescription>
            Each variant has a unique SKU, pricing, and physical attributes.
          </CardDescription>
        </div>
        {canManage && !showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus className="size-3.5" />
            Add variant
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {variants.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">
            No variants yet. Add the first variant to make this product
            available for sale.
          </p>
        ) : null}

        {variants.map((variant) => (
          <VariantRow
            canManage={canManage}
            canSeeCostPrice={canSeeCostPrice}
            canViewHistory={canViewHistory}
            key={variant.slug}
            productSlug={productSlug}
            variant={variant}
          />
        ))}

        {showForm ? (
          <AddVariantForm
            canSeeCostPrice={canSeeCostPrice}
            onCancel={() => setShowForm(false)}
            onSuccess={() => setShowForm(false)}
            options={options}
            productSlug={productSlug}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
