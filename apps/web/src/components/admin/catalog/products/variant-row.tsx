"use client";

import type { AdminVariantSummary } from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Images, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CATALOG_STATUS_META } from "@/lib/admin-models";
import {
  adminProductQueryKey,
  updateAdminVariant,
} from "@/lib/react-query/admin-catalog-products";
import { toRoute } from "@/lib/routes";
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
import { VariantRowDetails } from "./variant-row-details";

type VariantRowProps = {
  canManage: boolean;
  canSeeCostPrice: boolean;
  canViewHistory: boolean;
  productSlug: string;
  variant: AdminVariantSummary;
};

export function VariantRow({
  canManage,
  canSeeCostPrice,
  canViewHistory,
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

      <VariantRowDetails canSeeCostPrice={canSeeCostPrice} variant={variant} />

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
        {canViewHistory ? (
          <Link
            className={buttonVariants({ size: "sm", variant: "ghost" })}
            href={toRoute(
              `/admin/products/${productSlug}/variants/${variant.slug}/history`,
            )}
          >
            <History className="size-3.5" />
            History
          </Link>
        ) : null}
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
