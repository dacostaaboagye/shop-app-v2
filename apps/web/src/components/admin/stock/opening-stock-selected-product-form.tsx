import type { VariantSearchResult } from "@shop/contracts";
import { PackageSearch, Plus } from "lucide-react";
import type {
  FunctionComponent,
  KeyboardEvent,
  ReactNode,
  RefObject,
} from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OpeningStockFormValues } from "./opening-stock-setup.support";

type OpeningStockFormField = {
  handleChange: (
    value: OpeningStockFormValues[keyof OpeningStockFormValues],
  ) => void;
  name: keyof OpeningStockFormValues & string;
  state: {
    value: OpeningStockFormValues[keyof OpeningStockFormValues];
  };
};

type OpeningStockForm = {
  Field: (props: {
    children: (field: OpeningStockFormField) => ReactNode;
    name: keyof OpeningStockFormValues;
  }) => ReturnType<FunctionComponent>;
};

type Props = {
  canAdd: boolean;
  form: OpeningStockForm;
  isOpeningBlocked: boolean;
  isInReview: boolean;
  onAdd: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
  quantityInputRef: RefObject<HTMLInputElement | null>;
  selectedProduct: VariantSearchResult | null;
};

export function OpeningStockSelectedProductForm({
  canAdd,
  form,
  isOpeningBlocked,
  isInReview,
  onAdd,
  panelRef,
  quantityInputRef,
  selectedProduct,
}: Props) {
  if (!selectedProduct) {
    return (
      <AppEmptyState
        className="py-8"
        description="Choose a product from the searchable list. Its SKU and current quantity will be filled in here."
        icon={PackageSearch}
        title="Select a product for opening stock"
      />
    );
  }

  const handleQuantityKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (canAdd) onAdd();
  };

  return (
    <div
      className="rounded-lg border border-border/60 bg-background p-4"
      ref={panelRef}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{selectedProduct.productName}</p>
          <p className="text-sm text-muted-foreground">
            {selectedProduct.name}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {selectedProduct.sku}
          </p>
        </div>
        {isInReview ? (
          <Badge variant="secondary">Already in review</Badge>
        ) : null}
        {isOpeningBlocked ? (
          <Badge variant="outline">Opening stock already set</Badge>
        ) : null}
      </div>

      <dl className="mt-4 rounded-lg bg-muted/25 p-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Current on hand</dt>
          <dd className="font-semibold">{selectedProduct.onHandQuantity}</dd>
        </div>
      </dl>

      <form.Field name="quantityEntry">
        {(field) => {
          const quantityError = getOpeningQuantityError({
            isOpeningBlocked,
            value: field.state.value,
          });

          return (
            <AppFormField
              description="This starts from the current on-hand quantity. Change it only if the physical count is different."
              errors={quantityError ? [quantityError] : []}
              inputId={field.name}
              label="Opening quantity"
            >
              <Input
                aria-invalid={quantityError ? true : undefined}
                disabled={isOpeningBlocked}
                id={field.name}
                min={0}
                onChange={(event) => field.handleChange(event.target.value)}
                onKeyDown={handleQuantityKeyDown}
                placeholder="0"
                ref={quantityInputRef}
                type="number"
                value={field.state.value}
              />
            </AppFormField>
          );
        }}
      </form.Field>

      {isOpeningBlocked ? (
        <p className="mt-3 rounded-lg border border-border/60 bg-muted/25 p-3 text-sm text-muted-foreground">
          This product already has stock opened for this location. Use the stock
          count flow to correct its current quantity.
        </p>
      ) : null}

      <Button
        className="mt-3 w-full"
        disabled={!canAdd}
        onClick={onAdd}
        type="button"
      >
        <Plus data-icon="inline-start" />
        {isOpeningBlocked
          ? "Opening stock already set"
          : isInReview
            ? "Update review quantity"
            : "Add product to review"}
      </Button>
    </div>
  );
}

function getOpeningQuantityError(input: {
  isOpeningBlocked: boolean;
  value: OpeningStockFormValues["quantityEntry"];
}) {
  if (input.isOpeningBlocked) return null;
  const quantity = String(input.value).trim();
  if (!quantity) return "Enter an opening quantity before adding this product.";
  if (!/^\d+$/.test(quantity)) return "Enter a non-negative whole number.";
  return null;
}
