"use client";

import type {
  AdminCreateSupplierInquiryRequest,
  AdminProductSummary,
  AdminSupplierDetail,
} from "@shop/contracts";
import { ALLOWED_MEDIA_MIMES } from "@shop/contracts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FileField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "./supplier-form-controls";
import { SupplierInquiryList } from "./supplier-inquiry-list";
import { uploadSupplierInquiryAttachment } from "./supplier-inquiry-upload";

export function SupplierInquiryPanel(props: {
  inquiries: AdminSupplierDetail["inquiries"];
  isPending: boolean;
  onCreateInquiry: (input: AdminCreateSupplierInquiryRequest) => void;
  onUpdateInquiry: (
    reference: string,
    status: "cancelled" | "converted",
  ) => void;
  products: AdminProductSummary[];
  supplierSlug: string;
}) {
  const [attachment, setAttachment] = useState<File | null>(null);
  const [form, setForm] = useState({
    message: "",
    neededBy: "",
    productSlug: "",
    requestedProductName: "",
    requestedQuantity: 1,
  });
  const [uploading, setUploading] = useState(false);
  const isExternalInquiry = !form.productSlug;

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border/50 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
          Create sourcing inquiry
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="Catalogue product"
            onChange={(productSlug) =>
              setForm((value) => ({ ...value, productSlug }))
            }
            options={props.products.map((product) => ({
              label: product.name,
              value: product.slug,
            }))}
            placeholder="No product selected"
            value={form.productSlug}
          />
          <TextField
            label="Item to source"
            onChange={(requestedProductName) =>
              setForm((value) => ({ ...value, requestedProductName }))
            }
            value={form.requestedProductName}
          />
          <NumberField
            label="Quantity"
            onChange={(requestedQuantity) =>
              setForm((value) => ({ ...value, requestedQuantity }))
            }
            value={form.requestedQuantity}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Needed by"
            onChange={(neededBy) =>
              setForm((value) => ({ ...value, neededBy }))
            }
            type="date"
            value={form.neededBy}
          />
          {isExternalInquiry ? (
            <FileField
              accept={ALLOWED_MEDIA_MIMES.join(",")}
              disabled={uploading}
              file={attachment}
              label="Attachment"
              onChange={setAttachment}
            />
          ) : null}
        </div>
        <TextAreaField
          label="Message"
          onChange={(message) => setForm((value) => ({ ...value, message }))}
          value={form.message}
        />
        <div className="flex justify-start">
          <Button
            className="h-11 rounded-xl px-8"
            disabled={
              !form.message.trim() ||
              (!form.productSlug && !form.requestedProductName.trim()) ||
              props.isPending ||
              uploading
            }
            onClick={async () => {
              const uploaded = attachment
                ? await uploadSupplierInquiryAttachment({
                    entitySlug: props.supplierSlug,
                    file: attachment,
                    setUploading,
                  })
                : null;
              if (attachment && !uploaded) return;
              props.onCreateInquiry({
                attachmentMimeType: uploaded?.mimeType ?? null,
                attachmentName: uploaded ? (attachment?.name ?? null) : null,
                attachmentUrl: uploaded?.publicUrl ?? null,
                message: form.message,
                neededBy: form.neededBy
                  ? new Date(form.neededBy).toISOString()
                  : null,
                productSlug: form.productSlug || null,
                requestedProductName: form.requestedProductName || null,
                requestedQuantity: form.requestedQuantity,
              });
            }}
            size="sm"
            type="button"
          >
            Send inquiry
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
          Managed inquiries
        </h3>
        <SupplierInquiryList
          inquiries={props.inquiries}
          onUpdateInquiry={props.onUpdateInquiry}
        />
      </div>
    </div>
  );
}
