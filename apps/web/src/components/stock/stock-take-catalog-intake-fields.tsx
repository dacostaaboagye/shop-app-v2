"use client";

import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BooleanSelect,
  ReadOnlyQuantity,
  ReferenceSelect,
} from "./stock-take-catalog-intake-choice-fields";
import type {
  CatalogIntakeFormApi,
  CatalogIntakeFormField,
} from "./stock-take-catalog-intake-form.api";

type CatalogReferenceItem = {
  name: string;
  slug: string;
};

type CatalogIntakeFieldsProps = {
  brands: readonly CatalogReferenceItem[];
  categories: readonly CatalogReferenceItem[];
  countedQuantity: number;
  form: CatalogIntakeFormApi;
  wasSubmitted: boolean;
};

export function StockTakeCatalogIntakeFields({
  brands,
  categories,
  countedQuantity,
  form,
  wasSubmitted,
}: CatalogIntakeFieldsProps) {
  return (
    <FieldGroup>
      <TextField
        form={form}
        label="Product name"
        maxLength={200}
        name="productName"
        placeholder="Omaya 1819 Backpack"
        wasSubmitted={wasSubmitted}
      />
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          form={form}
          label="Variant name"
          maxLength={160}
          name="variantName"
          placeholder="Default"
          wasSubmitted={wasSubmitted}
        />
        <TextField
          form={form}
          label="SKU"
          maxLength={80}
          name="sku"
          placeholder="OMAYA-1819"
          wasSubmitted={wasSubmitted}
        />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <TextField
          form={form}
          label="Unit"
          maxLength={40}
          name="unitOfMeasure"
          placeholder="each"
          wasSubmitted={wasSubmitted}
        />
        <MoneyField
          form={form}
          label="Cost price"
          name="costPrice"
          wasSubmitted={wasSubmitted}
        />
        <MoneyField
          form={form}
          label="Selling price"
          name="sellingPrice"
          wasSubmitted={wasSubmitted}
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <ReferenceSelect
          form={form}
          items={brands}
          label="Brand"
          name="brandSlug"
          placeholder="No brand"
        />
        <ReferenceSelect
          form={form}
          items={categories}
          label="Category"
          name="categorySlug"
          placeholder="No category"
        />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <ReadOnlyQuantity value={countedQuantity} />
        <BooleanSelect form={form} label="Taxable" name="isTaxable" />
        <BooleanSelect
          form={form}
          label="Price includes tax"
          name="priceIncludesTax"
        />
      </div>
      <form.Field name="description">
        {(field: CatalogIntakeFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Intake notes"
            showErrors={wasSubmitted}
          >
            <Textarea
              id={field.name}
              maxLength={5000}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Context from the stock count, supplier label, or shelf notes."
              value={String(field.state.value)}
            />
          </AppFormField>
        )}
      </form.Field>
    </FieldGroup>
  );
}

function TextField({
  form,
  label,
  maxLength,
  name,
  placeholder,
  wasSubmitted,
}: {
  form: CatalogIntakeFormApi;
  label: string;
  maxLength: number;
  name: "productName" | "sku" | "unitOfMeasure" | "variantName";
  placeholder: string;
  wasSubmitted: boolean;
}) {
  const message = `Enter ${label.toLowerCase()}.`;

  return (
    <form.Field
      name={name}
      validators={{
        onBlur: required(message),
        onSubmit: required(message),
      }}
    >
      {(field: CatalogIntakeFormField) => (
        <AppFormField
          errors={field.state.meta.errors}
          inputId={field.name}
          label={label}
          showErrors={showErrors(field, wasSubmitted)}
        >
          <Input
            id={field.name}
            maxLength={maxLength}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            placeholder={placeholder}
            value={String(field.state.value)}
          />
        </AppFormField>
      )}
    </form.Field>
  );
}

function MoneyField({
  form,
  label,
  name,
  wasSubmitted,
}: {
  form: CatalogIntakeFormApi;
  label: string;
  name: "costPrice" | "sellingPrice";
  wasSubmitted: boolean;
}) {
  return (
    <form.Field
      name={name}
      validators={{
        onBlur: money(`Enter a valid ${label.toLowerCase()}.`),
        onSubmit: money(`Enter a valid ${label.toLowerCase()}.`),
      }}
    >
      {(field: CatalogIntakeFormField) => (
        <AppFormField
          errors={field.state.meta.errors}
          inputId={field.name}
          label={label}
          showErrors={showErrors(field, wasSubmitted)}
        >
          <Input
            id={field.name}
            inputMode="decimal"
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            placeholder="0.00"
            value={String(field.state.value)}
          />
        </AppFormField>
      )}
    </form.Field>
  );
}

function required(message: string) {
  return ({ value }: { value: string }) => (value.trim() ? undefined : message);
}

function money(message: string) {
  return ({ value }: { value: string }) =>
    /^\d+(\.\d{1,2})?$/.test(value.trim()) ? undefined : message;
}

function showErrors(field: CatalogIntakeFormField, wasSubmitted: boolean) {
  return Boolean(
    (field.state.meta.isDirty && field.state.meta.isBlurred) || wasSubmitted,
  );
}
