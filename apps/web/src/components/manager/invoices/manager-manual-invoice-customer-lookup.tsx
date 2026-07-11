"use client";

import type { ManagerCustomerLookupItem } from "@shop/contracts";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppErrorBanner } from "@/components/system/app-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchManagerCustomerLookup,
  managerCustomerLookupQueryKey,
} from "@/lib/react-query/manual-invoices";
import { ManagerManualInvoiceCustomerContactSelect } from "./manager-manual-invoice-customer-contact-select";
import type { ManualInvoiceForm } from "./manual-invoice-request-create.support";

export function ManagerManualInvoiceCustomerLookup({
  form,
}: {
  form: ManualInvoiceForm;
}) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<ManagerCustomerLookupItem | null>(null);
  const lookupQuery = useMemo(
    () => ({ limit: 8, q: customerSearch.trim() }),
    [customerSearch],
  );
  const customerQuery = useQuery({
    enabled: lookupQuery.q.length >= 2,
    queryFn: () => fetchManagerCustomerLookup(lookupQuery),
    queryKey: managerCustomerLookupQueryKey(lookupQuery),
    staleTime: 30_000,
  });

  function selectContact(
    customer: ManagerCustomerLookupItem,
    contactReference: string,
  ) {
    const contact =
      customer.contacts.find(
        (item) => item.contactReference === contactReference,
      ) ?? null;
    form.setFieldValue("customerContactReference", contactReference);
    form.setFieldValue("customerName", contact?.name ?? customer.displayName);
    form.setFieldValue("customerEmail", contact?.email ?? "");
    form.setFieldValue("customerPhone", contact?.phone ?? "");
  }

  function selectCustomer(customer: ManagerCustomerLookupItem) {
    const invoiceContact =
      customer.contacts.find((contact) => contact.receivesInvoices) ??
      customer.contacts[0] ??
      null;
    setSelectedCustomer(customer);
    form.setFieldValue("customerSlug", customer.slug);
    form.setFieldValue("customerContactReference", "");
    form.setFieldValue("customerName", customer.displayName);
    form.setFieldValue("customerEmail", "");
    form.setFieldValue("customerPhone", "");
    form.setFieldValue("customerTaxNumber", customer.taxNumber ?? "");
    form.setFieldValue(
      "address",
      customer.billingAddressLines?.join("\n") ?? "",
    );
    if (invoiceContact) {
      selectContact(customer, invoiceContact.contactReference);
    }
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    form.setFieldValue("customerSlug", "");
    form.setFieldValue("customerContactReference", "");
  }

  return (
    <>
      <AppFormField
        inputId="manual-invoice-customer-search"
        label="CRM customer"
      >
        <div className="flex flex-col gap-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="manual-invoice-customer-search"
              className="pl-9"
              placeholder="Search customer name, reference, tax number, or contact"
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
            />
          </div>
          <CustomerLookupState
            customerQuery={customerQuery}
            hasSearch={lookupQuery.q.length >= 2}
            selectedCustomer={selectedCustomer}
            onClear={clearCustomer}
            onSelect={selectCustomer}
          />
        </div>
      </AppFormField>
      {selectedCustomer && selectedCustomer.contacts.length > 0 ? (
        <ManagerManualInvoiceCustomerContactSelect
          customer={selectedCustomer}
          form={form}
          onSelect={selectContact}
        />
      ) : null}
    </>
  );
}

function CustomerLookupState({
  customerQuery,
  hasSearch,
  selectedCustomer,
  onClear,
  onSelect,
}: {
  customerQuery: UseQueryResult<{ items: ManagerCustomerLookupItem[] }>;
  hasSearch: boolean;
  selectedCustomer: ManagerCustomerLookupItem | null;
  onClear: () => void;
  onSelect: (customer: ManagerCustomerLookupItem) => void;
}) {
  if (!hasSearch) {
    return (
      <p className="text-sm text-muted-foreground">
        Enter at least two characters to find a CRM customer.
      </p>
    );
  }

  if (customerQuery.isError) {
    return (
      <AppErrorBanner
        detail="Customer lookup could not be loaded."
        error={customerQuery.error}
        title="Customer lookup unavailable"
      />
    );
  }

  return (
    <>
      {selectedCustomer ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3">
          <Badge variant="secondary">{selectedCustomer.reference}</Badge>
          <span className="text-sm font-medium">
            {selectedCustomer.displayName}
          </span>
          <Button
            className="ml-auto"
            onClick={onClear}
            size="sm"
            type="button"
            variant="ghost"
          >
            <XIcon className="size-4" />
            Clear
          </Button>
        </div>
      ) : null}
      <div className="grid gap-2">
        {customerQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading customers...</p>
        ) : null}
        {customerQuery.data?.items.map((customer) => (
          <CustomerLookupOption
            customer={customer}
            key={customer.reference}
            onSelect={onSelect}
          />
        ))}
        {customerQuery.data && customerQuery.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active customers match this search.
          </p>
        ) : null}
      </div>
    </>
  );
}

function CustomerLookupOption({
  customer,
  onSelect,
}: {
  customer: ManagerCustomerLookupItem;
  onSelect: (customer: ManagerCustomerLookupItem) => void;
}) {
  const email = customer.contacts[0]?.email;

  return (
    <button
      className="flex flex-col gap-1 rounded-md border bg-background p-3 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onSelect(customer)}
      type="button"
    >
      <span className="font-medium">{customer.displayName}</span>
      <span className="text-muted-foreground">
        {customer.reference}
        {email ? ` - ${email}` : ""}
      </span>
    </button>
  );
}
