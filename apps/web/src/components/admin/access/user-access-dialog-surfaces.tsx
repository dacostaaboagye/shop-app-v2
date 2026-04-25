"use client";

import type { ReactNode } from "react";
import { CatalogFormError } from "@/components/admin/catalog/catalog-form-surfaces";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

export function UserAccessDialogHeader({
  description,
  title,
}: {
  description: ReactNode;
  title: string;
}) {
  return (
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
}

export function UserAccessDialogError({
  error,
  title,
}: {
  error: unknown;
  title: string;
}) {
  return <CatalogFormError error={error} title={title} />;
}

export function UserAccessDialogSubmit({
  canSubmit,
  isBusy,
  label,
  pendingLabel,
  variant = "default",
}: {
  canSubmit: boolean;
  isBusy: boolean;
  label: string;
  pendingLabel: string;
  variant?: "default" | "destructive";
}) {
  return (
    <DialogFooter showCloseButton>
      <Button disabled={!canSubmit || isBusy} type="submit" variant={variant}>
        {isBusy ? (
          <>
            <Spinner data-icon="inline-start" />
            {pendingLabel}
          </>
        ) : (
          label
        )}
      </Button>
    </DialogFooter>
  );
}
