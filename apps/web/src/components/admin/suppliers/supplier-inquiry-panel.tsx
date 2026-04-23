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
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
        {props.inquiries.length === 0 ? (
          <AppEmptyState
            description="Ask suppliers if they can source products, confirm availability, quote terms, or suggest alternatives before raising a purchase order."
            icon={MessageSquareText}
            kind="no-data"
            title="No sourcing inquiries"
          />
        ) : (
          <AppTableWrapper>
            {props.inquiries.map((inquiry, index) => (
              <InquiryRow
                index={index}
                inquiry={inquiry}
                itemCount={props.inquiries.length}
                key={inquiry.reference}
                onUpdateInquiry={props.onUpdateInquiry}
              />
            ))}
          </AppTableWrapper>
        )}
      </div>
    </div>
  );
}

function InquiryRow({
  index,
  inquiry,
  itemCount,
  onUpdateInquiry,
}: {
  index: number;
  inquiry: AdminSupplierDetail["inquiries"][number];
  itemCount: number;
  onUpdateInquiry: (
    reference: string,
    status: "cancelled" | "converted",
  ) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4",
        index !== itemCount - 1 && "border-b border-border/50",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">{inquiry.reference}</p>
            <Badge
              className="rounded-md font-bold uppercase tracking-wider text-[10px]"
              variant="secondary"
            >
              {inquiry.status}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {inquiry.productName ??
              inquiry.requestedProductName ??
              "External sourcing request"}
          </p>
        </div>
        {inquiry.status === "sent" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-8 rounded-lg"
              onClick={() => onUpdateInquiry(inquiry.reference, "converted")}
              size="sm"
              type="button"
              variant="outline"
            >
              Convert
            </Button>
            <Button
              className="h-8 rounded-lg"
              onClick={() => onUpdateInquiry(inquiry.reference, "cancelled")}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </div>
      <div className="rounded-xl bg-muted/20 p-3 ring-1 ring-border/10">
        <p className="text-sm leading-relaxed italic text-muted-foreground/80">
          "{inquiry.message}"
        </p>
      </div>
      {inquiry.attachmentUrl ? (
        <a
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
          href={inquiry.attachmentUrl}
          rel="noreferrer"
          target="_blank"
        >
          <MessageSquareText className="size-3" />
          {inquiry.attachmentName ?? "Open attachment"}
        </a>
      ) : null}
    </div>
  );
}
