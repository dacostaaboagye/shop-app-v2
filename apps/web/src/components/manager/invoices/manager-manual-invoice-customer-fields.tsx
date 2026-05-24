"use client";

import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormExtendedApi,
} from "@tanstack/react-form";
import { AppFormField } from "@/components/forms/app-form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ManualInvoiceRequestFormValues } from "./manual-invoice-request-create.support";

type ManualInvoiceFormValidate =
  | FormValidateOrFn<ManualInvoiceRequestFormValues>
  | undefined;
type ManualInvoiceFormAsyncValidate =
  | FormAsyncValidateOrFn<ManualInvoiceRequestFormValues>
  | undefined;

type ManualInvoiceForm = ReactFormExtendedApi<
  ManualInvoiceRequestFormValues,
  ManualInvoiceFormValidate,
  ManualInvoiceFormValidate,
  ManualInvoiceFormAsyncValidate,
  ManualInvoiceFormValidate,
  ManualInvoiceFormAsyncValidate,
  ManualInvoiceFormValidate,
  ManualInvoiceFormAsyncValidate,
  ManualInvoiceFormValidate,
  ManualInvoiceFormAsyncValidate,
  ManualInvoiceFormAsyncValidate,
  unknown
>;

export function ManagerManualInvoiceCustomerFields({
  form,
  wasSubmitted,
}: {
  form: ManualInvoiceForm;
  wasSubmitted: boolean;
}) {
  return (
    <>
      <form.Field name="customerEmail">
        {(field) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Customer email"
            showErrors={wasSubmitted}
          >
            <Input
              id={field.name}
              type="email"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="paymentMethod">
        {(field) => (
          <AppFormField inputId={field.name} label="Payment method">
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value)}
            >
              <SelectTrigger id={field.name}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not recorded</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="mobile_money">Mobile money</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="customerPhone">
        {(field) => (
          <AppFormField inputId={field.name} label="Customer phone">
            <Input
              id={field.name}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="customerTaxNumber">
        {(field) => (
          <AppFormField inputId={field.name} label="Customer tax number">
            <Input
              id={field.name}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="address">
        {(field) => (
          <AppFormField inputId={field.name} label="Billing address">
            <Textarea
              id={field.name}
              rows={3}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </AppFormField>
        )}
      </form.Field>
    </>
  );
}
