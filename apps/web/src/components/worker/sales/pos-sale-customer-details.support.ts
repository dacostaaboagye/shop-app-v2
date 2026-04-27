export type PosSaleCustomerDetails = {
  billingAddress: string;
  email: string;
  name: string;
  phone: string;
  taxNumber: string;
};

export function createEmptyPosSaleCustomerDetails(): PosSaleCustomerDetails {
  return {
    billingAddress: "",
    email: "",
    name: "",
    phone: "",
    taxNumber: "",
  };
}

export function normalizePosSaleCustomerDetails(
  details: PosSaleCustomerDetails,
): {
  customerBillingAddressLines?: string[];
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  customerTaxNumber?: string;
} {
  const name = details.name.trim();
  const email = details.email.trim();
  const phone = details.phone.trim();
  const taxNumber = details.taxNumber.trim();
  const addressLines = details.billingAddress
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    ...(addressLines.length > 0
      ? { customerBillingAddressLines: addressLines }
      : {}),
    ...(email ? { customerEmail: email } : {}),
    ...(name ? { customerName: name } : {}),
    ...(phone ? { customerPhone: phone } : {}),
    ...(taxNumber ? { customerTaxNumber: taxNumber } : {}),
  };
}
