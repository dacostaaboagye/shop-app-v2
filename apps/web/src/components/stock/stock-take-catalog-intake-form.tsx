"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CatalogFormCard,
  CatalogFormError,
} from "@/components/admin/catalog/catalog-form-surfaces";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  createAdminProduct,
  createAdminVariant,
} from "@/lib/react-query/admin-catalog-products";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  type CatalogIntakeDraftValues,
  getCatalogIntakeDraftValidation,
  toCatalogIntakeRequests,
} from "./stock-take-catalog-intake.support";
import { StockTakeCatalogIntakeFields } from "./stock-take-catalog-intake-fields";
import type { CatalogIntakeFormApi } from "./stock-take-catalog-intake-form.api";

type CatalogReferenceItem = {
  name: string;
  slug: string;
};

type CreatedCatalogDraft = {
  productSlug: string;
  variantSlug: string;
};

type StockTakeCatalogIntakeFormProps = {
  brands: readonly CatalogReferenceItem[];
  canCreate: boolean;
  categories: readonly CatalogReferenceItem[];
  disabledReason: string | null;
  draft: CatalogIntakeDraftValues;
  onCancel: () => void;
};

export function StockTakeCatalogIntakeForm({
  brands,
  canCreate,
  categories,
  disabledReason,
  draft,
  onCancel,
}: StockTakeCatalogIntakeFormProps) {
  const queryClient = useQueryClient();
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [createdDraft, setCreatedDraft] = useState<CreatedCatalogDraft | null>(
    null,
  );
  const createMutation = useMutation({
    mutationFn: createCatalogDraft,
    onSuccess: (result) => {
      setCreatedDraft(result);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "catalog", "products"],
      });
      toast.success("Catalog draft created");
    },
  });
  const form = useForm({
    defaultValues: draft,
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      await createMutation.mutateAsync(value);
    },
  });

  useEffect(() => {
    createMutation.reset();
    setCreatedDraft(null);
    setWasSubmitted(false);
    form.reset(draft);
  }, [draft, form, createMutation]);

  return (
    <CatalogFormCard
      description="Complete the catalog defaults for this manual count row. The record is created as archived so it cannot sell or affect stock until catalog review."
      title={`Line ${draft.lineNumber} catalog draft`}
    >
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setWasSubmitted(true);
          void form.handleSubmit();
        }}
      >
        <CatalogDraftSafetyNotice />
        {disabledReason ? (
          <Alert variant="destructive">
            <AlertTitle>Catalog intake locked</AlertTitle>
            <AlertDescription>{disabledReason}</AlertDescription>
          </Alert>
        ) : null}
        <CatalogFormError
          error={createMutation.error}
          title="Unable to create catalog draft"
        />
        {createdDraft ? <CreatedDraftNotice draft={createdDraft} /> : null}
        <StockTakeCatalogIntakeFields
          brands={brands}
          categories={categories}
          countedQuantity={draft.countedQuantity}
          form={form as CatalogIntakeFormApi}
          wasSubmitted={wasSubmitted}
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
                onClick={onCancel}
                size="sm"
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  !canCreate ||
                  !canSubmit ||
                  isSubmitting ||
                  createMutation.isPending
                }
                size="sm"
                type="submit"
              >
                {isSubmitting || createMutation.isPending
                  ? "Creating..."
                  : "Create catalog draft"}
              </Button>
            </div>
          )}
        </form.Subscribe>
      </form>
    </CatalogFormCard>
  );
}

async function createCatalogDraft(value: CatalogIntakeDraftValues) {
  const validation = getCatalogIntakeDraftValidation(value);
  if (validation) throw new Error(validation);

  const requests = toCatalogIntakeRequests(value);
  const product = await createAdminProduct(requests.product);
  const variant = await createAdminVariant(product.slug, requests.variant);
  return { productSlug: product.slug, variantSlug: variant.slug };
}

function CatalogDraftSafetyNotice() {
  return (
    <Alert>
      <AlertTitle>Draft safety</AlertTitle>
      <AlertDescription>
        This creates an archived product and archived default variant only.
        Opening stock remains a separate review step.
      </AlertDescription>
    </Alert>
  );
}

function CreatedDraftNotice({ draft }: { draft: CreatedCatalogDraft }) {
  return (
    <Alert>
      <AlertTitle>Draft created</AlertTitle>
      <AlertDescription>
        Product and variant drafts are archived. Review them in catalog before
        activation.
      </AlertDescription>
      <Link
        className={cn(
          buttonVariants({ size: "sm", variant: "outline" }),
          "mt-3 w-fit",
        )}
        href={toRoute(
          `/admin/products/${encodeURIComponent(draft.productSlug)}`,
        )}
      >
        Open catalog draft
      </Link>
    </Alert>
  );
}
