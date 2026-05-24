"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import {
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/suppliers/supplier-form-controls";
import { AppFormField } from "@/components/forms/app-form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { CustomerFormValues } from "./customer-display";

export function CustomerForm({
  defaultValues,
  error,
  isPending,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<CustomerFormValues>;
  error?: Error | null;
  isPending: boolean;
  onSubmit: (values: CustomerFormValues) => void;
  submitLabel: string;
}) {
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const form = useForm({
    defaultValues: {
      creditLimitAmount: "",
      customerType: "business" as const,
      defaultCurrencyCode: "GHS",
      displayName: "",
      legalName: "",
      notes: "",
      paymentTermsDays: 0,
      status: "active" as const,
      taxNumber: "",
      ...defaultValues,
    },
    onSubmit: async ({ value }) => {
      onSubmit({
        ...value,
        creditLimitAmount: value.creditLimitAmount.trim(),
        defaultCurrencyCode: value.defaultCurrencyCode.trim().toUpperCase(),
        displayName: value.displayName.trim(),
        legalName: value.legalName.trim(),
        notes: value.notes.trim(),
        taxNumber: value.taxNumber.trim(),
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
          <AlertTitle>Unable to save customer</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        <form.Field
          name="displayName"
          validators={{
            onSubmit: ({ value }) =>
              value.trim() ? undefined : "Enter customer name.",
          }}
        >
          {(field) => (
            <AppFormField
              errors={field.state.meta.errors}
              inputId={field.name}
              label="Customer name"
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
        <TextField
          label="Legal name"
          onChange={(value) => form.setFieldValue("legalName", value)}
          value={form.state.values.legalName}
        />
        <SelectField
          label="Customer type"
          onChange={(value) =>
            form.setFieldValue(
              "customerType",
              value as CustomerFormValues["customerType"],
            )
          }
          options={[
            { label: "Business", value: "business" },
            { label: "Individual", value: "individual" },
          ]}
          placeholder="Customer type"
          value={form.state.values.customerType}
        />
        <SelectField
          label="Status"
          onChange={(value) =>
            form.setFieldValue("status", value as CustomerFormValues["status"])
          }
          options={[
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
            { label: "Blocked", value: "blocked" },
          ]}
          placeholder="Status"
          value={form.state.values.status}
        />
        <TextField
          label="Tax number"
          onChange={(value) => form.setFieldValue("taxNumber", value)}
          value={form.state.values.taxNumber}
        />
        <TextField
          label="Currency"
          onChange={(value) => form.setFieldValue("defaultCurrencyCode", value)}
          value={form.state.values.defaultCurrencyCode}
        />
        <NumberField
          label="Payment terms days"
          min={0}
          onChange={(value) => form.setFieldValue("paymentTermsDays", value)}
          value={form.state.values.paymentTermsDays}
        />
        <TextField
          label="Credit limit"
          onChange={(value) => form.setFieldValue("creditLimitAmount", value)}
          value={form.state.values.creditLimitAmount}
        />
        <TextAreaField
          label="Notes"
          onChange={(value) => form.setFieldValue("notes", value)}
          value={form.state.values.notes}
        />
      </FieldGroup>
      <div className="flex justify-end">
        <Button disabled={isPending} size="sm" type="submit">
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
