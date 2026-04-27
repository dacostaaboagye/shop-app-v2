import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEmptyPosSaleCustomerDetails,
  normalizePosSaleCustomerDetails,
} from "./pos-sale-customer-details.support";

describe("POS sale customer details support", () => {
  it("creates an empty customer details shape", () => {
    assert.deepEqual(createEmptyPosSaleCustomerDetails(), {
      billingAddress: "",
      email: "",
      name: "",
      phone: "",
      taxNumber: "",
    });
  });

  it("normalizes trimmed optional buyer details for the sale request", () => {
    const normalized = normalizePosSaleCustomerDetails({
      billingAddress: " 12 Market Street \n Accra \n\n ",
      email: " buyer@example.com ",
      name: " Adwoa Mensah ",
      phone: " +233200000000 ",
      taxNumber: " TIN-123 ",
    });

    assert.deepEqual(normalized, {
      customerBillingAddressLines: ["12 Market Street", "Accra"],
      customerEmail: "buyer@example.com",
      customerName: "Adwoa Mensah",
      customerPhone: "+233200000000",
      customerTaxNumber: "TIN-123",
    });
  });

  it("omits empty buyer details from the sale request", () => {
    assert.deepEqual(
      normalizePosSaleCustomerDetails(createEmptyPosSaleCustomerDetails()),
      {},
    );
  });
});
