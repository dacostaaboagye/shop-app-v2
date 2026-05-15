"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  buildStockCountRequest,
  createStockCountFormDefaults,
  type StockCountFormProps,
  validateStockCountNote,
  validateStockCountQuantity,
  validateStockCountSku,
} from "./stock-count-form.support";
import {
  NoteTextareaField,
  QuantityInputField,
  ReasonSelectField,
  SkuInputField,
} from "./stock-count-form-fields";

export function StockCountForm({
  error,
  initialTarget = null,
  isPending,
  locationSlug,
  onCancel,
  onSubmit,
  row,
}: StockCountFormProps) {
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const form = useForm({
    defaultValues: createStockCountFormDefaults(row, initialTarget),
    onSubmit: async ({ value }) => {
      onSubmit(buildStockCountRequest({ locationSlug, row, values: value }));
    },
  });

  const reservedQuantity =
    row?.reservedQuantity ?? initialTarget?.reservedQuantity ?? 0;
  const currentOnHandQuantity =
    row?.onHandQuantity ?? initialTarget?.onHandQuantity ?? null;
  const selectedSku = row?.sku ?? initialTarget?.sku ?? "";

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
      <FieldGroup>
        {!row && !initialTarget ? (
          <form.Field
            name="sku"
            validators={{
              onBlur: ({ value }) =>
                value.trim() ? validateStockCountSku(value) : undefined,
              onSubmit: ({ value }) => validateStockCountSku(value),
            }}
          >
            {(field) => (
              <SkuInputField
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
        ) : null}

        {!row && initialTarget ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="type-data-label text-muted-foreground">
              Selected SKU
            </p>
            <p className="mt-1 font-mono text-sm">{selectedSku}</p>
            <p className="type-support mt-1 text-xs">
              {initialTarget.productName} - {initialTarget.variantName}
            </p>
          </div>
        ) : null}

        <form.Field
          name="quantity"
          validators={{
            onBlur: ({ value }) =>
              value.trim() ? validateStockCountQuantity(value) : undefined,
            onSubmit: ({ value }) => validateStockCountQuantity(value),
          }}
        >
          {(field) => {
            const parsedQuantity = Number.parseInt(field.state.value, 10);
            const belowReserved =
              !Number.isNaN(parsedQuantity) &&
              parsedQuantity < reservedQuantity;
            const errors = belowReserved
              ? [
                  `Quantity cannot be below reserved stock (${reservedQuantity}).`,
                  ...field.state.meta.errors,
                ]
              : field.state.meta.errors;

            return (
              <QuantityInputField
                description={
                  row
                    ? `Current on-hand: ${row.onHandQuantity}. Reserved: ${row.reservedQuantity}.`
                    : currentOnHandQuantity !== null
                      ? `Current on-hand: ${currentOnHandQuantity}. Reserved: ${reservedQuantity}.`
                      : "Enter the physical quantity counted at this location."
                }
                errors={errors}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                showErrors={
                  wasSubmitted ||
                  (field.state.meta.isDirty && field.state.meta.isBlurred)
                }
                value={field.state.value}
              />
            );
          }}
        </form.Field>

        <form.Field name="reasonCode">
          {(field) => (
            <ReasonSelectField
              onChange={field.handleChange}
              value={field.state.value}
            />
          )}
        </form.Field>

        <form.Field
          name="note"
          validators={{
            onBlur: ({ value }) => validateStockCountNote(value),
            onSubmit: ({ value }) => validateStockCountNote(value),
          }}
        >
          {(field) => (
            <NoteTextareaField
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
          detail="Could not save this stock count. Check the quantity and try again."
          error={error}
          title="Unable to save stock count"
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
            const parsedQuantity = Number.parseInt(values.quantity, 10);
            const invalidQuantity = validateStockCountQuantity(values.quantity);
            const belowReserved =
              !Number.isNaN(parsedQuantity) &&
              parsedQuantity < reservedQuantity;
            const invalidSku = row
              ? undefined
              : validateStockCountSku(values.sku);
            const disabled =
              !canSubmit ||
              isSubmitting ||
              isPending ||
              !!invalidQuantity ||
              !!invalidSku ||
              belowReserved;

            return (
              <Button disabled={disabled} type="submit">
                {isPending || isSubmitting ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Saving...
                  </>
                ) : (
                  "Save count"
                )}
              </Button>
            );
          }}
        </form.Subscribe>
      </div>
    </form>
  );
}
