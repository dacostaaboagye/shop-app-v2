"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import {
  SwitchField,
  TextField,
} from "@/components/admin/suppliers/supplier-form-controls";
import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  ContactStatusField,
  type CustomerContactFormValues,
  FormSubmitButton,
  InlineFormError,
  trimContactValues,
} from "./customer-secondary-form-support";

export function CustomerContactForm({
  error,
  isPending,
  onSubmit,
}: {
  error?: Error | null | undefined;
  isPending: boolean;
  onSubmit: (values: CustomerContactFormValues) => void;
}) {
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const defaultValues: CustomerContactFormValues = {
    email: "",
    isPrimary: false,
    name: "",
    phone: "",
    receivesDeliveryUpdates: false,
    receivesInvoices: true,
    roleTitle: "",
    status: "active",
  };
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => onSubmit(trimContactValues(value)),
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
      <InlineFormError error={error} title="Unable to add contact" />
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        <form.Field
          name="name"
          validators={{
            onSubmit: ({ value }) =>
              value.trim() ? undefined : "Enter contact name.",
          }}
        >
          {(field) => (
            <AppFormField
              errors={field.state.meta.errors}
              inputId={field.name}
              label="Contact name"
              showErrors={wasSubmitted}
            >
              <Input
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                value={field.state.value}
              />
            </AppFormField>
          )}
        </form.Field>
        <TextField
          label="Email"
          onChange={(value) => form.setFieldValue("email", value)}
          value={form.state.values.email}
        />
        <TextField
          label="Phone"
          onChange={(value) => form.setFieldValue("phone", value)}
          value={form.state.values.phone}
        />
        <TextField
          label="Role"
          onChange={(value) => form.setFieldValue("roleTitle", value)}
          value={form.state.values.roleTitle}
        />
        <ContactStatusField
          onChange={(value) => form.setFieldValue("status", value)}
          value={form.state.values.status}
        />
        <SwitchField
          label="Primary contact"
          onChange={(value) => form.setFieldValue("isPrimary", value)}
          value={form.state.values.isPrimary}
        />
        <SwitchField
          label="Receives invoices"
          onChange={(value) => form.setFieldValue("receivesInvoices", value)}
          value={form.state.values.receivesInvoices}
        />
        <SwitchField
          label="Delivery updates"
          onChange={(value) =>
            form.setFieldValue("receivesDeliveryUpdates", value)
          }
          value={form.state.values.receivesDeliveryUpdates}
        />
      </FieldGroup>
      <FormSubmitButton isPending={isPending} label="Add contact" />
    </form>
  );
}

export type { CustomerContactFormValues };
