"use client";

import { AppFormField } from "@/components/forms/app-form-field";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CatalogIntakeFormApi,
  CatalogIntakeFormField,
} from "./stock-take-catalog-intake-form.api";

type CatalogReferenceItem = {
  name: string;
  slug: string;
};

export function ReferenceSelect({
  form,
  items,
  label,
  name,
  placeholder,
}: {
  form: CatalogIntakeFormApi;
  items: readonly CatalogReferenceItem[];
  label: string;
  name: "brandSlug" | "categorySlug";
  placeholder: string;
}) {
  return (
    <form.Field name={name}>
      {(field: CatalogIntakeFormField) => (
        <AppFormField inputId={field.name} label={label}>
          <Select
            onValueChange={(value) => field.handleChange(value)}
            value={String(field.state.value)}
          >
            <SelectTrigger id={field.name}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{placeholder}</SelectItem>
              {items.map((item) => (
                <SelectItem key={item.slug} value={item.slug}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AppFormField>
      )}
    </form.Field>
  );
}

export function BooleanSelect({
  form,
  label,
  name,
}: {
  form: CatalogIntakeFormApi;
  label: string;
  name: "isTaxable" | "priceIncludesTax";
}) {
  return (
    <form.Field name={name}>
      {(field: CatalogIntakeFormField) => (
        <AppFormField inputId={field.name} label={label}>
          <Select
            onValueChange={(value) => field.handleChange(value === "true")}
            value={String(field.state.value)}
          >
            <SelectTrigger id={field.name}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </AppFormField>
      )}
    </form.Field>
  );
}

export function ReadOnlyQuantity({ value }: { value: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
      <span className="type-support text-muted-foreground">
        Counted quantity
      </span>
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-semibold text-foreground">{value}</span>
        <Badge variant="secondary">Stock not created</Badge>
      </div>
    </div>
  );
}
