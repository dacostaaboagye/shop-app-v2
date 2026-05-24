import { AppError } from "../_core/errors/app-error.js";
import type { AdminCustomerQueryService } from "./admin-customer-query.service.js";
import type { AdminCustomerWriteService } from "./admin-customer-write.service.js";

export type AdminCustomerRouteDependencies = {
  adminCustomerQueryService: Pick<
    AdminCustomerQueryService,
    "getCustomer" | "listCustomers"
  >;
  adminCustomerWriteService: Pick<
    AdminCustomerWriteService,
    "addAddress" | "addContact" | "createCustomer" | "updateCustomer"
  >;
};

export function createUnavailableCustomerDependencies(): AdminCustomerRouteDependencies {
  return {
    adminCustomerQueryService: {
      async getCustomer() {
        throw unavailableCustomerError();
      },
      async listCustomers() {
        throw unavailableCustomerError();
      },
    },
    adminCustomerWriteService: {
      async addAddress() {
        throw unavailableCustomerError();
      },
      async addContact() {
        throw unavailableCustomerError();
      },
      async createCustomer() {
        throw unavailableCustomerError();
      },
      async updateCustomer() {
        throw unavailableCustomerError();
      },
    },
  };
}

export function customerNotFound(slug: string) {
  return new AppError({
    code: "not_found",
    detail: `Customer "${slug}" does not exist.`,
    statusCode: 404,
    title: "Customer not found",
  });
}

function unavailableCustomerError() {
  return new AppError({
    code: "internal_error",
    detail: "Admin customer services are not configured for this environment.",
    statusCode: 503,
    title: "Admin customers unavailable",
  });
}
