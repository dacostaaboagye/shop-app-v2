export type SalesCustomerSnapshot = {
  billingAddressLines: string[] | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  taxNumber: string | null;
};

export type SalesCustomerLinkSelection = {
  customerContactId: string | null;
  customerContactReference: string | null;
  customerId: string;
  customerReference: string;
  customerSlug: string;
  snapshot: SalesCustomerSnapshot;
};

export type SalesCustomerLinkRequest = {
  customerContactReference?: string | null;
  customerSlug?: string | null;
};

export type SalesCustomerLinkResolver = {
  resolveCustomerLink: (
    input: SalesCustomerLinkRequest,
  ) => Promise<SalesCustomerLinkSelection | null>;
};
