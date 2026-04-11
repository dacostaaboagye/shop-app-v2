"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { VariantFormFields } from "./variant-form-fields";
import type { VariantFormValues } from "./variant-form.support";

type VariantEditFormProps = {
  canSeeCostPrice: boolean;
  defaultValues: VariantFormValues;
  error: unknown;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (values: VariantFormValues) => Promise<void> | void;
};

export function VariantEditForm({
  canSeeCostPrice,
  defaultValues,
  error,
  isPending,
  onCancel,
  onSubmit,
}: VariantEditFormProps) {
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      await onSubmit(value);
    },
  });

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border border-dashed border-border/70 bg-muted/10 p-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setWasSubmitted(true);
        void form.handleSubmit();
      }}
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to update variant</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred."}
          </AlertDescription>
        </Alert>
      ) : null}

      <VariantFormFields
        canSeeCostPrice={canSeeCostPrice}
        form={form as never}
        showErrors={wasSubmitted}
      />

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => (
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              disabled={isPending}
              onClick={onCancel}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={!canSubmit || isSubmitting || isPending}
              size="sm"
              type="submit"
            >
              {isSubmitting || isPending ? "Saving…" : "Save variant"}
            </Button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
