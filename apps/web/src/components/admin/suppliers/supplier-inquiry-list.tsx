"use client";

import type { AdminSupplierDetail } from "@shop/contracts";
import { MessageSquareText } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SupplierInquiryList(props: {
  inquiries: AdminSupplierDetail["inquiries"];
  onUpdateInquiry: (
    reference: string,
    status: "cancelled" | "converted",
  ) => void;
}) {
  if (props.inquiries.length === 0) {
    return (
      <AppEmptyState
        description="Ask suppliers if they can source products, confirm availability, quote terms, or suggest alternatives before raising a purchase order."
        icon={MessageSquareText}
        kind="no-data"
        title="No sourcing inquiries"
      />
    );
  }

  return (
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
  );
}

function InquiryRow(props: {
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
        props.index !== props.itemCount - 1 && "border-b border-border/50",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">
              {props.inquiry.reference}
            </p>
            <Badge
              className="rounded-md font-bold uppercase tracking-wider text-[10px]"
              variant="secondary"
            >
              {props.inquiry.status}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {props.inquiry.productName ??
              props.inquiry.requestedProductName ??
              "External sourcing request"}
          </p>
        </div>
        {props.inquiry.status === "sent" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-8 rounded-lg"
              onClick={() =>
                props.onUpdateInquiry(props.inquiry.reference, "converted")
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Convert
            </Button>
            <Button
              className="h-8 rounded-lg"
              onClick={() =>
                props.onUpdateInquiry(props.inquiry.reference, "cancelled")
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
      <div className="rounded-xl bg-muted/20 p-3 ring-1 ring-border/10">
        <p className="text-sm italic leading-relaxed text-muted-foreground/80">
          "{props.inquiry.message}"
        </p>
      </div>
      {props.inquiry.attachmentUrl ? (
        <a
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
          href={props.inquiry.attachmentUrl}
          rel="noreferrer"
          target="_blank"
        >
          <MessageSquareText className="size-3" />
          {props.inquiry.attachmentName ?? "Open attachment"}
        </a>
      ) : null}
    </div>
  );
}
