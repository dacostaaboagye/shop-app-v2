"use client";

import type {
  AdminCreateSupplierInquiryRequest,
  AdminProductSummary,
  AdminSupplierDetail,
} from "@shop/contracts";
import { ALLOWED_MEDIA_MIMES } from "@shop/contracts";
import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "./supplier-form-controls";
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
    <Card>
      <CardHeader>
        <CardTitle>Sourcing inquiries</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-3">
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
        <div className="grid gap-3 md:grid-cols-2">
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
        <Button
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
        {props.inquiries.length === 0 ? (
          <AppEmptyState
            description="Ask suppliers if they can source products, confirm availability, quote terms, or suggest alternatives before raising a purchase order."
            icon={MessageSquareText}
            kind="no-data"
            title="No sourcing inquiries"
          />
        ) : (
          props.inquiries.map((inquiry) => (
            <div
              className="rounded-md border border-border p-3"
              key={inquiry.reference}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{inquiry.reference}</p>
                  <p className="text-sm text-muted-foreground">
                    {inquiry.productName ??
                      inquiry.requestedProductName ??
                      "External sourcing request"}
                  </p>
                </div>
                <Badge variant="outline">{inquiry.status}</Badge>
              </div>
              <p className="mt-2 text-sm">{inquiry.message}</p>
              {inquiry.attachmentUrl ? (
                <a
                  className="mt-2 inline-flex text-sm text-primary underline-offset-4 hover:underline"
                  href={inquiry.attachmentUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {inquiry.attachmentName ?? "Open attachment"}
                </a>
              ) : null}
              {inquiry.status === "sent" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      props.onUpdateInquiry(inquiry.reference, "converted")
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Convert
                  </Button>
                  <Button
                    onClick={() =>
                      props.onUpdateInquiry(inquiry.reference, "cancelled")
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
