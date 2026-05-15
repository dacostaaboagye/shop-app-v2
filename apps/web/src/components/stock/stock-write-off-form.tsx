"use client";

import type {
  AdminStockBalanceSummary,
  StockWriteOffRequest,
} from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  WriteOffNoteField,
  WriteOffQuantityField,
  WriteOffReasonField,
  WriteOffStockSummary,
} from "./stock-write-off-fields";
import {
  buildWriteOffRequest,
  createWriteOffFormDefaults,
  validateWriteOffNote,
  validateWriteOffQuantity,
} from "./stock-write-off-form.support";

export function StockWriteOffForm({
  error,
  isPending,
  locationSlug,
  onCancel,
  onSubmit,
  row,
}: {
  error: unknown;
  isPending: boolean;
  locationSlug: string;
  onCancel: () => void;
  onSubmit: (request: StockWriteOffRequest) => void;
  row: AdminStockBalanceSummary;
}) {
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const form = useForm({
    defaultValues: createWriteOffFormDefaults(),
    onSubmit: async ({ value }) => {
      onSubmit(buildWriteOffRequest({ locationSlug, row, values: value }));
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setWasSubmitted(true);
        void form.handleSubmit();
      }}
    >
      <WriteOffStockSummary row={row} />
      <FieldGroup>
        <form.Field
          name="quantity"
          validators={{
            onBlur: ({ value }) =>
              validateWriteOffQuantity(value, row.availableQuantity),
            onSubmit: ({ value }) =>
              validateWriteOffQuantity(value, row.availableQuantity),
          }}
        >
          {(field) => (
            <WriteOffQuantityField
              availableQuantity={row.availableQuantity}
              errors={field.state.meta.errors}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              showErrors={
                wasSubmitted ||
                (field.state.meta.isDirty && field.state.meta.isBlurred)
              }
              value={field.state.value}
            />
          )}
        </form.Field>
        <form.Field name="reasonCode">
          {(field) => (
            <WriteOffReasonField
              onChange={field.handleChange}
              value={field.state.value}
            />
          )}
        </form.Field>
        <form.Field
          name="note"
          validators={{
            onBlur: ({ value }) => validateWriteOffNote(value),
            onSubmit: ({ value }) => validateWriteOffNote(value),
          }}
        >
          {(field) => (
            <WriteOffNoteField
              errors={field.state.meta.errors}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              showErrors={
                wasSubmitted ||
                (field.state.meta.isDirty && field.state.meta.isBlurred)
              }
              value={field.state.value}
            />
          )}
        </form.Field>
      </FieldGroup>
      {error ? (
        <AppErrorBanner
          detail="Could not record this write-off. Check available stock and try again."
          error={error}
          title="Unable to write off stock"
        />
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
            values: state.values,
          })}
        >
          {({ canSubmit, isSubmitting, values }) => {
            const disabled =
              !canSubmit ||
              isSubmitting ||
              isPending ||
              !!validateWriteOffQuantity(
                values.quantity,
                row.availableQuantity,
              ) ||
              !!validateWriteOffNote(values.note);
            return (
              <Button disabled={disabled} type="submit" variant="destructive">
                {isPending || isSubmitting ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Recording...
                  </>
                ) : (
                  "Record write-off"
                )}
              </Button>
            );
          }}
        </form.Subscribe>
      </div>
    </form>
  );
}
