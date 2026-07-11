import type {
  AdminCreateCustomerAddressRequest,
  AdminCreateCustomerContactRequest,
  AdminCreateCustomerRequest,
  AdminCustomerDetail,
  AdminLinkCustomerContactPortalRequest,
  AdminUpdateCustomerRequest,
} from "@shop/contracts";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";

export type AdminCustomerWriteRepository = {
  addAddress(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateCustomerAddressRequest;
    reference: string;
    customerSlug: string;
  }): Promise<AdminCustomerDetail | null>;
  addContact(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateCustomerContactRequest;
    reference: string;
    customerSlug: string;
  }): Promise<AdminCustomerDetail | null>;
  createCustomer(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateCustomerRequest;
    reference: string;
  }): Promise<AdminCustomerDetail>;
  linkContactPortal(input: {
    actorId: string;
    contactReference: string;
    customerSlug: string;
    now: Date;
    payload: AdminLinkCustomerContactPortalRequest;
  }): Promise<AdminCustomerDetail | null>;
  unlinkContactPortal(input: {
    actorId: string;
    contactReference: string;
    customerSlug: string;
    now: Date;
  }): Promise<AdminCustomerDetail | null>;
  updateCustomer(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateCustomerRequest;
    customerSlug: string;
  }): Promise<AdminCustomerDetail | null>;
};

export class AdminCustomerWriteService {
  constructor(
    private readonly repository: AdminCustomerWriteRepository,
    private readonly referenceNumberService: Pick<
      ReferenceNumberService,
      "generateReference"
    >,
  ) {}

  async addAddress(
    customerSlug: string,
    actorId: string,
    payload: AdminCreateCustomerAddressRequest,
    now: Date,
  ) {
    const reference = await this.referenceNumberService.generateReference({
      now,
      sequenceKey: "customer-address",
    });
    return this.repository.addAddress({
      actorId,
      customerSlug,
      now,
      payload,
      reference,
    });
  }

  async addContact(
    customerSlug: string,
    actorId: string,
    payload: AdminCreateCustomerContactRequest,
    now: Date,
  ) {
    const reference = await this.referenceNumberService.generateReference({
      now,
      sequenceKey: "customer-contact",
    });
    return this.repository.addContact({
      actorId,
      customerSlug,
      now,
      payload,
      reference,
    });
  }

  async createCustomer(
    actorId: string,
    payload: AdminCreateCustomerRequest,
    now: Date,
  ) {
    const reference = await this.referenceNumberService.generateReference({
      now,
      sequenceKey: "customer",
    });
    return this.repository.createCustomer({ actorId, now, payload, reference });
  }

  async updateCustomer(
    customerSlug: string,
    actorId: string,
    payload: AdminUpdateCustomerRequest,
    now: Date,
  ) {
    return this.repository.updateCustomer({
      actorId,
      customerSlug,
      now,
      payload,
    });
  }

  linkContactPortal(
    customerSlug: string,
    contactReference: string,
    actorId: string,
    payload: AdminLinkCustomerContactPortalRequest,
    now: Date,
  ) {
    return this.repository.linkContactPortal({
      actorId,
      contactReference,
      customerSlug,
      now,
      payload,
    });
  }

  unlinkContactPortal(
    customerSlug: string,
    contactReference: string,
    actorId: string,
    now: Date,
  ) {
    return this.repository.unlinkContactPortal({
      actorId,
      contactReference,
      customerSlug,
      now,
    });
  }
}
