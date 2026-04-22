"use client";

import type { AdminSupplierDetail } from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addAdminSupplierContact,
  adminSupplierQueryKey,
  createAdminSupplierInquiry,
  createAdminSupplierProcurementOrder,
  linkAdminSupplierProduct,
  receiveAdminSupplierProcurementOrder,
  removeAdminSupplierContact,
  transitionAdminSupplierProcurementOrder,
  unlinkAdminSupplierProduct,
  updateAdminSupplier,
  updateAdminSupplierInquiry,
} from "@/lib/react-query/admin-directory";
import { toast } from "@/lib/toast";
import type { SupplierFormValues } from "./supplier-form";

export function useSupplierDetailActions(input: {
  refetchSupplier: () => void;
  slug: string;
}) {
  const queryClient = useQueryClient();
  const setSupplier = (supplier: AdminSupplierDetail) => {
    queryClient.setQueryData(adminSupplierQueryKey(input.slug), supplier);
  };

  const updateMutation = useMutation({
    mutationFn: (values: SupplierFormValues) =>
      updateAdminSupplier(input.slug, {
        email: values.email || null,
        legalName: values.legalName || null,
        name: values.name,
        notes: values.notes || null,
        paymentTermsDays: values.paymentTermsDays,
        phone: values.phone || null,
        status: values.status,
        taxId: values.taxId || null,
        website: values.website || null,
      }),
    onSuccess: (supplier) => {
      setSupplier(supplier);
      void queryClient.invalidateQueries({ queryKey: ["admin", "suppliers"] });
      toast.success("Supplier updated");
    },
  });
  const contactMutation = useMutation({
    mutationFn: (payload: Parameters<typeof addAdminSupplierContact>[1]) =>
      addAdminSupplierContact(input.slug, payload),
    onSuccess: (supplier) => {
      setSupplier(supplier);
      toast.success("Supplier contact added");
    },
  });
  const removeContactMutation = useMutation({
    mutationFn: (contactReference: string) =>
      removeAdminSupplierContact(input.slug, contactReference),
    onSuccess: () => {
      input.refetchSupplier();
      toast.success("Supplier contact removed");
    },
  });
  const productMutation = useMutation({
    mutationFn: (payload: Parameters<typeof linkAdminSupplierProduct>[1]) =>
      linkAdminSupplierProduct(input.slug, payload),
    onSuccess: (supplier) => {
      setSupplier(supplier);
      toast.success("Product linked");
    },
  });
  const unlinkProductMutation = useMutation({
    mutationFn: (productSlug: string) =>
      unlinkAdminSupplierProduct(input.slug, productSlug),
    onSuccess: () => {
      input.refetchSupplier();
      void queryClient.invalidateQueries({ queryKey: ["admin", "suppliers"] });
      toast.success("Product removed from supplier");
    },
  });
  const inquiryMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createAdminSupplierInquiry>[1]) =>
      createAdminSupplierInquiry(input.slug, payload),
    onSuccess: (supplier) => {
      setSupplier(supplier);
      toast.success("Supplier inquiry sent");
    },
  });
  const inquiryStatusMutation = useMutation({
    mutationFn: (payload: {
      reference: string;
      status: "cancelled" | "converted";
    }) =>
      updateAdminSupplierInquiry(input.slug, payload.reference, {
        status: payload.status,
      }),
    onSuccess: (supplier) => {
      setSupplier(supplier);
      toast.success("Supplier inquiry updated");
    },
  });
  const procurementCreateMutation = useMutation({
    mutationFn: (
      payload: Parameters<typeof createAdminSupplierProcurementOrder>[1],
    ) => createAdminSupplierProcurementOrder(input.slug, payload),
    onSuccess: (supplier) => {
      setSupplier(supplier);
      toast.success("Supplier purchase order drafted");
    },
  });
  const procurementActionMutation = useMutation({
    mutationFn: (payload: {
      action: "approve" | "cancel" | "close" | "order" | "submit";
      reference: string;
    }) =>
      transitionAdminSupplierProcurementOrder(
        input.slug,
        payload.reference,
        payload.action,
      ),
    onSuccess: (supplier) => {
      setSupplier(supplier);
      toast.success("Supplier order updated");
    },
  });
  const procurementReceiveMutation = useMutation({
    mutationFn: (payload: {
      lines: Parameters<
        typeof receiveAdminSupplierProcurementOrder
      >[2]["lines"];
      reference: string;
    }) =>
      receiveAdminSupplierProcurementOrder(input.slug, payload.reference, {
        lines: payload.lines,
      }),
    onSuccess: (supplier) => {
      setSupplier(supplier);
      toast.success("Supplier order receipt recorded");
    },
  });

  return {
    contactMutation,
    inquiryMutation,
    inquiryStatusMutation,
    procurementActionMutation,
    procurementCreateMutation,
    procurementReceiveMutation,
    productMutation,
    removeContactMutation,
    unlinkProductMutation,
    updateMutation,
  };
}
