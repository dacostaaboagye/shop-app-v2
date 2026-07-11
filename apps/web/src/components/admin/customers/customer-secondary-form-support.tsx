"use client";

import { AppFormField } from "@/components/forms/app-form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CustomerContactFormValues = {
  email: string;
  isPrimary: boolean;
  name: string;
  phone: string;
  receivesDeliveryUpdates: boolean;
  receivesInvoices: boolean;
  roleTitle: string;
  status: "active" | "inactive";
};

export type CustomerAddressFormValues = {
  addressLines: string;
  city: string;
  countryCode: string;
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
  label: string;
  recipientName: string;
  recipientPhone: string;
  region: string;
  type: "billing" | "both" | "shipping";
};

export function InlineFormError({
  error,
  title,
}: {
  error?: Error | null | undefined;
  title: string;
}) {
  return error ? (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  ) : null;
}

export function FormSubmitButton({
  isPending,
  label,
}: {
  isPending: boolean;
  label: string;
}) {
  return (
    <div className="flex justify-end">
      <Button disabled={isPending} size="sm" type="submit">
        {isPending ? "Saving..." : label}
      </Button>
    </div>
  );
}

export function ContactStatusField({
  onChange,
  value,
}: {
  onChange: (value: "active" | "inactive") => void;
  value: "active" | "inactive";
}) {
  return (
    <AppFormField inputId="customer-contact-status" label="Status">
      <Select
        onValueChange={(next) => onChange(next as typeof value)}
        value={value}
      >
        <SelectTrigger id="customer-contact-status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </AppFormField>
  );
}

export function AddressTypeField({
  onChange,
  value,
}: {
  onChange: (value: "billing" | "both" | "shipping") => void;
  value: "billing" | "both" | "shipping";
}) {
  return (
    <AppFormField inputId="customer-address-type" label="Type">
      <Select
        onValueChange={(next) => onChange(next as typeof value)}
        value={value}
      >
        <SelectTrigger id="customer-address-type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="both">Billing and shipping</SelectItem>
          <SelectItem value="billing">Billing</SelectItem>
          <SelectItem value="shipping">Shipping</SelectItem>
        </SelectContent>
      </Select>
    </AppFormField>
  );
}

export function trimContactValues(
  values: CustomerContactFormValues,
): CustomerContactFormValues {
  return {
    ...values,
    email: values.email.trim(),
    name: values.name.trim(),
    phone: values.phone.trim(),
    roleTitle: values.roleTitle.trim(),
  };
}

export function trimAddressValues(
  values: CustomerAddressFormValues,
): CustomerAddressFormValues {
  return {
    ...values,
    addressLines: values.addressLines.trim(),
    city: values.city.trim(),
    countryCode: values.countryCode.trim().toUpperCase(),
    label: values.label.trim(),
    recipientName: values.recipientName.trim(),
    recipientPhone: values.recipientPhone.trim(),
    region: values.region.trim(),
  };
}
