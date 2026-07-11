"use client";

import type { ManagerCustomerLookupItem } from "@shop/contracts";
import { AppFormField } from "@/components/forms/app-form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ManualInvoiceForm } from "./manual-invoice-request-create.support";

export function ManagerManualInvoiceCustomerContactSelect({
  customer,
  form,
  onSelect,
}: {
  customer: ManagerCustomerLookupItem;
  form: ManualInvoiceForm;
  onSelect: (
    customer: ManagerCustomerLookupItem,
    contactReference: string,
  ) => void;
}) {
  return (
    <form.Field name="customerContactReference">
      {(field) => (
        <AppFormField inputId={field.name} label="Invoice contact">
          <Select
            value={field.state.value || "none"}
            onValueChange={(value) => {
              const contactReference = value === "none" ? "" : value;
              field.handleChange(contactReference);
              onSelect(customer, contactReference);
            }}
          >
            <SelectTrigger id={field.name}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific contact</SelectItem>
              {customer.contacts.map((contact) => (
                <SelectItem
                  key={contact.contactReference}
                  value={contact.contactReference}
                >
                  {contact.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AppFormField>
      )}
    </form.Field>
  );
}
