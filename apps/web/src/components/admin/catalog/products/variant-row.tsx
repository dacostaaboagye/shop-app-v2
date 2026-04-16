"use client";

import type { AdminVariantSummary } from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Images, Pencil, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATALOG_STATUS_META } from "@/lib/admin-models";
import {
  adminProductQueryKey,
  updateAdminVariant,
} from "@/lib/react-query/admin-catalog-products";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { MediaPanel } from "../media/media-panel";
import { VariantArchiveDialog } from "./variant-archive-dialog";
import { VariantEditForm } from "./variant-edit-form";
import {
  getVariantArchiveRequest,
  getVariantFormValues,
  toVariantUpdateRequest,
  type VariantFormValues,
} from "./variant-form.support";

type VariantRowProps = {
  canManage: boolean;
  canSeeCostPrice: boolean;
  productSlug: string;
  variant: AdminVariantSummary;
};

export function VariantRow({
  canManage,
  canSeeCostPrice,
  productSlug,
  variant,
}: VariantRowProps) {
  const queryClient = useQueryClient();
  const statusMeta = CATALOG_STATUS_META[variant.status];
  const productQueryKey = adminProductQueryKey(productSlug);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMedia, setShowMedia] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (values: VariantFormValues) =>
      updateAdminVariant(
        productSlug,
        variant.slug,
        toVariantUpdateRequest(values, canSeeCostPrice),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKey });
      setShowArchiveDialog(false);
      setIsEditing(false);
      toast.success("Variant saved");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      updateAdminVariant(productSlug, variant.slug, getVariantArchiveRequest()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKey });
      setShowArchiveDialog(false);
      setIsEditing(false);
      toast.success("Variant archived");
    },
  });

  const actionError = updateMutation.isError
    ? updateMutation.error
    : archiveMutation.isError
      ? archiveMutation.error
      : null;
  const isBusy = updateMutation.isPending || archiveMutation.isPending;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{variant.name}</p>
          <p className="font-mono text-[0.68rem] text-muted-foreground">
            {variant.sku}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {variant.isDefault ? (
            <Badge variant="secondary">Default</Badge>
          ) : null}
          <Badge className={cn(statusMeta.className)} variant="outline">
            {statusMeta.label}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Selling price</p>
          <p className="font-medium">{variant.sellingPrice}</p>
        </div>
        {canSeeCostPrice ? (
          <div>
            <p className="text-xs text-muted-foreground">Cost price</p>
            <p className="font-medium">{variant.costPrice}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs text-muted-foreground">Unit</p>
          <p>{variant.unitOfMeasure}</p>
        </div>
        {variant.weightGrams ? (
          <div>
            <p className="text-xs text-muted-foreground">Weight</p>
            <p>{variant.weightGrams} g</p>
          </div>
        ) : null}
        {Object.entries(variant.attributes).length > 0 ? (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Attributes</p>
            <p>
              {Object.entries(variant.attributes)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ")}
            </p>
          </div>
        ) : null}
        {variant.packagingType ? (
          <div>
            <p className="text-xs text-muted-foreground">Packaging</p>
            <p>{variant.packagingType}</p>
          </div>
        ) : null}
        {variant.barcode ? (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Barcode</p>
            <p className="font-mono text-[0.72rem]">{variant.barcode}</p>
          </div>
        ) : null}
        {variant.isTaxable !== null ? (
          <div>
            <p className="text-xs text-muted-foreground">Taxable?</p>
            <p>{variant.isTaxable ? "Yes" : "No"}</p>
          </div>
        ) : null}
        {variant.taxCategory ? (
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Tax category</p>
            <p>{variant.taxCategory}</p>
          </div>
        ) : null}
      </div>

      {!isEditing && actionError ? (
        <Alert variant="destructive">
          <AlertTitle>Variant update failed</AlertTitle>
          <AlertDescription>
            {actionError instanceof Error
              ? actionError.message
              : "An unexpected error occurred."}
          </AlertDescription>
        </Alert>
      ) : null}

      {isEditing ? (
        <VariantEditForm
          canSeeCostPrice={canSeeCostPrice}
          defaultValues={getVariantFormValues(variant)}
          error={actionError}
          isPending={isBusy}
          onCancel={() => {
            setShowArchiveDialog(false);
            setIsEditing(false);
          }}
          onSubmit={async (values) => {
            await updateMutation.mutateAsync(values);
          }}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          onClick={() => setShowMedia((value) => !value)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Images className="size-3.5" />
          {showMedia ? "Hide media" : "Media"}
        </Button>
        {canManage ? (
          <>
            {!isEditing ? (
              <Button
                disabled={isBusy}
                onClick={() => {
                  setShowArchiveDialog(false);
                  setIsEditing(true);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
            ) : (
              <Button
                disabled={isBusy}
                onClick={() => setIsEditing(false)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <X className="size-3.5" />
                Close editor
              </Button>
            )}
            {variant.status !== "archived" ? (
              <Button
                className="text-destructive hover:text-destructive"
                disabled={isBusy}
                onClick={() => {
                  setIsEditing(false);
                  setShowArchiveDialog(true);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Archive
              </Button>
            ) : null}
          </>
        ) : null}
      </div>

      <VariantArchiveDialog
        isDefault={variant.isDefault}
        isPending={archiveMutation.isPending}
        name={variant.name}
        onConfirm={() => archiveMutation.mutate()}
        onOpenChange={setShowArchiveDialog}
        open={showArchiveDialog}
      />

      {showMedia ? (
        <MediaPanel
          canManage={canManage}
          entitySlug={variant.slug}
          entityType="variant"
        />
      ) : null}
    </div>
  );
}
