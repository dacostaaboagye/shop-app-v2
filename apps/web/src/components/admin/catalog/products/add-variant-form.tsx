"use client";

import type {
  AdminCreateVariantRequest,
  AdminProductOption,
} from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  adminProductQueryKey,
  createAdminVariant,
} from "@/lib/react-query/admin-catalog-products";
import { toast } from "@/lib/toast";
import { OptionsPrefill } from "./add-variant-options-prefill";
import { VariantFormFields } from "./variant-form-fields";
import {
  getDefaultVariantFormValues,
  toVariantCreateRequest,
} from "./variant-form.support";

type AddVariantFormProps = {
  canSeeCostPrice: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  options: AdminProductOption[];
  productSlug: string;
};

export function AddVariantForm({
  canSeeCostPrice,
  onCancel,
  onSuccess,
  options,
  productSlug,
}: AddVariantFormProps) {
  const queryClient = useQueryClient();
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const createMutation = useMutation({
    mutationFn: (input: AdminCreateVariantRequest) =>
      createAdminVariant(productSlug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminProductQueryKey(productSlug),
      });
      onSuccess();
      toast.success("Variant added");
    },
  });

  const form = useForm({
    defaultValues: getDefaultVariantFormValues(),
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      await createMutation.mutateAsync(
        toVariantCreateRequest(value, canSeeCostPrice),
      );
    },
  });

  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <p className="mb-4 text-sm font-medium">New variant</p>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setWasSubmitted(true);
          void form.handleSubmit();
        }}
      >
        {createMutation.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to add variant</AlertTitle>
            <AlertDescription>
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : "An unexpected error occurred."}
            </AlertDescription>
          </Alert>
        ) : null}

        {options.length > 0 ? (
          <OptionsPrefill
            onApply={(name, sku) => {
              form.setFieldValue("name", name);
              form.setFieldValue("sku", sku);
            }}
            options={options}
            productSlug={productSlug}
          />
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
            <div className="flex justify-end gap-3">
              <Button
                onClick={onCancel}
                size="sm"
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  !canSubmit || isSubmitting || createMutation.isPending
                }
                size="sm"
                type="submit"
              >
                {isSubmitting || createMutation.isPending
                  ? "Adding…"
                  : "Add variant"}
              </Button>
            </div>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
