"use client";

import { useForm } from "@tanstack/react-form";
import {
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/admin/suppliers/supplier-form-controls";
import { FieldGroup } from "@/components/ui/field";
import {
  AddressTypeField,
  type CustomerAddressFormValues,
  FormSubmitButton,
  InlineFormError,
  trimAddressValues,
} from "./customer-secondary-form-support";

export function CustomerAddressForm({
  error,
  isPending,
  onSubmit,
}: {
  error?: Error | null | undefined;
  isPending: boolean;
  onSubmit: (values: CustomerAddressFormValues) => void;
}) {
  const defaultValues: CustomerAddressFormValues = {
    addressLines: "",
    city: "",
    countryCode: "GH",
    isDefaultBilling: false,
    isDefaultShipping: false,
    label: "",
    recipientName: "",
    recipientPhone: "",
    region: "",
    type: "both",
  };
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => onSubmit(trimAddressValues(value)),
  });

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <InlineFormError error={error} title="Unable to add address" />
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Label"
          onChange={(value) => form.setFieldValue("label", value)}
          value={form.state.values.label}
        />
        <AddressTypeField
          onChange={(value) => form.setFieldValue("type", value)}
          value={form.state.values.type}
        />
        <TextField
          label="Recipient"
          onChange={(value) => form.setFieldValue("recipientName", value)}
          value={form.state.values.recipientName}
        />
        <TextField
          label="Recipient phone"
          onChange={(value) => form.setFieldValue("recipientPhone", value)}
          value={form.state.values.recipientPhone}
        />
        <TextAreaField
          label="Address lines"
          onChange={(value) => form.setFieldValue("addressLines", value)}
          value={form.state.values.addressLines}
        />
        <TextField
          label="City"
          onChange={(value) => form.setFieldValue("city", value)}
          value={form.state.values.city}
        />
        <TextField
          label="Region"
          onChange={(value) => form.setFieldValue("region", value)}
          value={form.state.values.region}
        />
        <TextField
          label="Country code"
          onChange={(value) => form.setFieldValue("countryCode", value)}
          value={form.state.values.countryCode}
        />
        <SwitchField
          label="Default billing"
          onChange={(value) => form.setFieldValue("isDefaultBilling", value)}
          value={form.state.values.isDefaultBilling}
        />
        <SwitchField
          label="Default shipping"
          onChange={(value) => form.setFieldValue("isDefaultShipping", value)}
          value={form.state.values.isDefaultShipping}
        />
      </FieldGroup>
      <FormSubmitButton isPending={isPending} label="Add address" />
    </form>
  );
}

export type { CustomerAddressFormValues };
