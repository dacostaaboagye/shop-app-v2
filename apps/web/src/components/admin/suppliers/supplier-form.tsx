"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SupplierFormValues = {
  email: string;
  legalName: string;
  name: string;
  notes: string;
  paymentTermsDays: number;
  phone: string;
  status: "active" | "inactive";
  taxId: string;
  website: string;
};

export function SupplierForm({
  defaultValues,
  error,
  isPending,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<SupplierFormValues>;
  error?: Error | null;
  isPending: boolean;
  onSubmit: (values: SupplierFormValues) => void;
  submitLabel: string;
}) {
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const form = useForm({
    defaultValues: {
      email: "",
      legalName: "",
      name: "",
      notes: "",
      paymentTermsDays: 0,
      phone: "",
      status: "active" as const,
      taxId: "",
      website: "",
      ...defaultValues,
    },
    onSubmit: async ({ value }) => {
      onSubmit({
        ...value,
        email: value.email.trim(),
        legalName: value.legalName.trim(),
        name: value.name.trim(),
        notes: value.notes.trim(),
        phone: value.phone.trim(),
        taxId: value.taxId.trim(),
        website: value.website.trim(),
      });
    },
  });

  return (
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
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to save supplier</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        <form.Field
          name="name"
          validators={{
            onSubmit: ({ value }) =>
              value.trim() ? undefined : "Enter supplier name.",
          }}
        >
          {(field) => (
            <AppFormField
              errors={field.state.meta.errors}
              inputId={field.name}
              label="Supplier name"
              showErrors={wasSubmitted}
            >
              <Input
                id={field.name}
                maxLength={180}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                value={field.state.value}
              />
            </AppFormField>
          )}
        </form.Field>
        <TextField form={form} label="Legal name" name="legalName" />
        <TextField form={form} label="Email" name="email" />
        <TextField form={form} label="Phone" name="phone" />
        <TextField form={form} label="Website" name="website" />
        <TextField form={form} label="Tax ID" name="taxId" />
        <form.Field name="paymentTermsDays">
          {(field) => (
            <AppFormField
              errors={field.state.meta.errors}
              inputId={field.name}
              label="Payment terms days"
              showErrors={wasSubmitted}
            >
              <Input
                id={field.name}
                min={0}
                onBlur={field.handleBlur}
                onChange={(event) =>
                  field.handleChange(Number(event.target.value))
                }
                type="number"
                value={field.state.value}
              />
            </AppFormField>
          )}
        </form.Field>
        <form.Field name="status">
          {(field) => (
            <AppFormField
              errors={field.state.meta.errors}
              inputId={field.name}
              label="Status"
              showErrors={wasSubmitted}
            >
              <Select
                onValueChange={(value) =>
                  field.handleChange(value as "active" | "inactive")
                }
                value={field.state.value}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </AppFormField>
          )}
        </form.Field>
        <TextField form={form} label="Notes" name="notes" />
      </FieldGroup>
      <div className="flex justify-end">
        <Button disabled={isPending} size="sm" type="submit">
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function TextField({
  form,
  label,
  name,
}: {
  // TanStack Form's generic Field component is intentionally carried through
  // from the local form instance; typing this helper exactly is noisier than
  // the UI it renders.
  // biome-ignore lint/suspicious/noExplicitAny: local field renderer helper
  form: any;
  label: string;
  name: keyof SupplierFormValues;
}) {
  return (
    <form.Field name={name}>
      {
        // biome-ignore lint/suspicious/noExplicitAny: local field renderer helper
        (field: any) => (
          <AppFormField inputId={field.name} label={label}>
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={String(field.state.value)}
            />
          </AppFormField>
        )
      }
    </form.Field>
  );
}
