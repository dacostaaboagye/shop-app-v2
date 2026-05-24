"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addAdminCustomerAddress,
  addAdminCustomerContact,
  adminCustomerQueryKey,
  linkAdminCustomerContactPortal,
  unlinkAdminCustomerContactPortal,
  updateAdminCustomer,
} from "@/lib/react-query/admin-directory";
import { toast } from "@/lib/toast";
import type { CustomerAddressFormValues } from "./customer-address-form";
import type { CustomerContactFormValues } from "./customer-contact-form";
import type { CustomerFormValues } from "./customer-display";

export function useCustomerDetailActions({
  refetchCustomer,
  slug,
}: {
  refetchCustomer: () => void;
  slug: string;
}) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: adminCustomerQueryKey(slug),
    });
    void queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    refetchCustomer();
  };

  const updateMutation = useMutation({
    mutationFn: (values: CustomerFormValues) =>
      updateAdminCustomer(slug, {
        creditLimitAmount: values.creditLimitAmount || null,
        customerType: values.customerType,
        defaultCurrencyCode: values.defaultCurrencyCode || null,
        displayName: values.displayName,
        legalName: values.legalName || null,
        notes: values.notes || null,
        paymentTermsDays: values.paymentTermsDays,
        status: values.status,
        taxNumber: values.taxNumber || null,
      }),
    onSuccess: () => {
      toast.success("Customer updated");
      invalidate();
    },
  });

  const contactMutation = useMutation({
    mutationFn: (values: CustomerContactFormValues) =>
      addAdminCustomerContact(slug, {
        email: values.email || null,
        isPrimary: values.isPrimary,
        name: values.name,
        phone: values.phone || null,
        receivesDeliveryUpdates: values.receivesDeliveryUpdates,
        receivesInvoices: values.receivesInvoices,
        roleTitle: values.roleTitle || null,
        status: values.status,
      }),
    onSuccess: () => {
      toast.success("Contact added");
      invalidate();
    },
  });

  const addressMutation = useMutation({
    mutationFn: (values: CustomerAddressFormValues) =>
      addAdminCustomerAddress(slug, {
        addressLines: values.addressLines
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean),
        city: values.city || null,
        countryCode: values.countryCode || null,
        isDefaultBilling: values.isDefaultBilling,
        isDefaultShipping: values.isDefaultShipping,
        label: values.label,
        recipientName: values.recipientName || null,
        recipientPhone: values.recipientPhone || null,
        region: values.region || null,
        type: values.type,
      }),
    onSuccess: () => {
      toast.success("Address added");
      invalidate();
    },
  });

  const linkPortalMutation = useMutation({
    mutationFn: (input: { contactReference: string; userSlug: string }) =>
      linkAdminCustomerContactPortal(slug, input.contactReference, {
        userSlug: input.userSlug,
      }),
    onSuccess: () => {
      toast.success("Customer portal access linked");
      invalidate();
    },
  });

  const unlinkPortalMutation = useMutation({
    mutationFn: (contactReference: string) =>
      unlinkAdminCustomerContactPortal(slug, contactReference),
    onSuccess: () => {
      toast.success("Customer portal access revoked");
      invalidate();
    },
  });

  return {
    addressMutation,
    contactMutation,
    linkPortalMutation,
    unlinkPortalMutation,
    updateMutation,
  };
}
