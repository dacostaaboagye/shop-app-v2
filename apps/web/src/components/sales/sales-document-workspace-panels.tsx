"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SalesDocumentActions } from "@/components/sales/sales-document-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  formatDateTime,
  formatPublicReference,
  formatSupportText,
} from "@/lib/display/format";
import type { OfficialDocumentProfile } from "@/lib/documents/official-document-profile";
import type { PrintableInvoiceData } from "@/lib/documents/sales-document";
import { formatMoney } from "@/lib/money/format-money";
import { fetchSalesDocumentDownloadFile } from "@/lib/react-query/official-documents";
import { toRoute } from "@/lib/routes";

export function OfficialDocumentPanel({
  detailBasePath,
  actionsDisabled,
  invoice,
  onPrint,
  profile,
  secondaryAction,
}: {
  detailBasePath: string;
  actionsDisabled: boolean;
  invoice: PrintableInvoiceData;
  onPrint: () => void;
  profile: OfficialDocumentProfile;
  secondaryAction?: ReactNode;
}) {
  const statusLabel = formatDocumentStatus(invoice.status);
  const documentTypeLabel = getDocumentTypeLabel(invoice);

  return (
    <Card className="hero-panel border-border/80">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="type-kicker text-muted-foreground">
              Official document
            </p>
            <h2 className="type-section-title mt-1 text-foreground sm:text-3xl">
              {formatPublicReference(invoice.reference)}
            </h2>
            <p className="type-support mt-1">
              {formatDateTime(invoice.confirmedAt ?? invoice.createdAt, {
                locale: profile.locale,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={getDocumentBadgeVariant(invoice)}>
              {documentTypeLabel}
            </Badge>
            <Badge variant={getStatusBadgeVariant(invoice.status)}>
              {statusLabel}
            </Badge>
            {invoice.revisionChain?.isLatestPayable ? (
              <Badge variant="outline">Latest payable</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <DocumentChainSummary
          detailBasePath={detailBasePath}
          invoice={invoice}
        />
        <div className="flex flex-wrap gap-2">
          <SalesDocumentActions
            disabled={actionsDisabled}
            getDocumentFile={() =>
              fetchSalesDocumentDownloadFile(invoice.reference)
            }
            invoice={invoice}
            onPrint={onPrint}
            profile={profile}
          />
          {secondaryAction}
        </div>
      </CardContent>
    </Card>
  );
}

export function SalesSummary({
  invoice,
  profile,
  showWorkerAttribution,
}: {
  invoice: PrintableInvoiceData;
  profile: OfficialDocumentProfile;
  showWorkerAttribution: boolean;
}) {
  const documentTypeLabel = getDocumentTypeLabel(invoice);
  const statusLabel = formatDocumentStatus(invoice.status);

  return (
    <Card>
      <CardHeader className="pb-0">
        <p className="type-section-title text-xl text-foreground">
          Sale details
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 pt-4 text-sm sm:grid-cols-3">
        <SummaryItem label="Document type" value={documentTypeLabel} />
        <SummaryItem label="Status" value={statusLabel} />
        <SummaryItem
          label="Payment"
          value={formatPaymentMethod(invoice.paymentMethod)}
        />
        <SummaryItem
          label="Subtotal"
          value={formatMoney(invoice.subtotalAmount, profile)}
          mono
        />
        <SummaryItem
          label="Total"
          value={formatMoney(invoice.totalAmount, profile)}
          prominent
        />
        {showWorkerAttribution && invoice.attributedWorkerId ? (
          <WorkerAttribution invoice={invoice} />
        ) : null}
        {invoice.notes ? (
          <div className="col-span-full">
            <p className="type-data-label">Notes</p>
            <p className="type-data-value">{invoice.notes}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function RelatedDocumentsPanel({
  detailBasePath,
  invoice,
}: {
  detailBasePath: string;
  invoice: PrintableInvoiceData;
}) {
  const links = buildRelatedDocumentLinks(invoice);

  if (links.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-0">
        <p className="type-section-title text-xl text-foreground">
          Related documents
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="mb-4 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <p className="type-data-label">Document chain</p>
          <p className="type-support mt-1">
            Follow the origin, adjustment, and latest payable document without
            reconciling references manually.
          </p>
        </div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch xl:gap-2">
          {links.map((link, index) => (
            <DocumentChainCard
              detailBasePath={detailBasePath}
              isLast={index === links.length - 1}
              key={`${link.label}:${link.reference}`}
              link={link}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function InvoiceLineItems({
  invoice,
  profile,
}: {
  invoice: PrintableInvoiceData;
  profile: OfficialDocumentProfile;
}) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <p className="type-section-title text-xl text-foreground">Line items</p>
      </CardHeader>
      <CardContent className="p-0 pt-3">
        <div className="divide-y divide-border">
          {invoice.lines.map((line) => (
            <div
              key={line.skuId}
              className="flex items-start gap-3 px-5 py-3 sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="type-data-value text-balance">
                  {line.skuSnapshot.productName}
                </p>
                <p className="type-support text-pretty">
                  {line.skuSnapshot.variantName} | {line.skuSnapshot.sku}
                </p>
                <p className="type-support mt-0.5">
                  {formatMoney(line.unitPrice, profile)} x {line.quantity}
                </p>
              </div>
              <p className="type-inline-metric shrink-0 font-semibold">
                {formatMoney(line.lineTotal, profile)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
          <span className="type-data-value text-sm">Total</span>
          <span className="type-inline-metric font-bold">
            {formatMoney(invoice.totalAmount, profile)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkerAttribution({ invoice }: { invoice: PrintableInvoiceData }) {
  return (
    <div className="col-span-full">
      <p className="type-data-label">Attributed worker</p>
      {invoice.attributedWorkerName ? (
        <p className="type-data-value text-balance">
          {invoice.attributedWorkerName}
        </p>
      ) : null}
      {invoice.attributedWorkerEmail ? (
        <p className="type-support break-all">
          {invoice.attributedWorkerEmail}
        </p>
      ) : null}
      {!invoice.attributedWorkerName && !invoice.attributedWorkerEmail ? (
        <p className="type-support">
          {formatSupportText(null, "Worker attribution pending")}
        </p>
      ) : null}
    </div>
  );
}

function DocumentChainSummary({
  detailBasePath,
  invoice,
}: {
  detailBasePath: string;
  invoice: PrintableInvoiceData;
}) {
  const summary = getDocumentChainSummary(invoice);

  if (!summary) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
      <p className="type-data-label">Document status</p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {summary.title}
      </p>
      <p className="type-support mt-1">{summary.description}</p>
      {summary.currentPayableReference ? (
        <div className="mt-3">
          <Link
            className={buttonVariants({
              className: "h-8 rounded-lg",
              size: "sm",
              variant: "outline",
            })}
            href={toRoute(
              `${detailBasePath}/${encodeURIComponent(summary.currentPayableReference)}`,
            )}
          >
            Open latest payable document
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function SummaryItem({
  label,
  mono,
  prominent,
  value,
}: {
  label: string;
  mono?: boolean;
  prominent?: boolean;
  value: string;
}) {
  return (
    <div>
      <p className="type-data-label">{label}</p>
      <p className={summaryValueClassName({ mono, prominent })}>{value}</p>
    </div>
  );
}

function summaryValueClassName(input: {
  mono: boolean | undefined;
  prominent: boolean | undefined;
}) {
  if (input.prominent) return "type-inline-metric text-base font-bold";
  if (input.mono) return "type-inline-metric font-medium";
  return "type-data-value";
}

function formatPaymentMethod(value: string | null): string {
  if (value === "mobile_money") return "Mobile money";
  if (!value) return "Not recorded";
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

function formatDocumentStatus(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

function getDocumentTypeLabel(invoice: PrintableInvoiceData): string {
  if (invoice.type === "credit_note") return "Credit note";
  if (invoice.type === "adjusted") return "Adjusted invoice";
  return "Sales receipt";
}

function getDocumentBadgeVariant(invoice: PrintableInvoiceData) {
  if (invoice.type === "credit_note") return "destructive" as const;
  if (invoice.type === "adjusted") return "outline" as const;
  return "secondary" as const;
}

function getStatusBadgeVariant(status: string) {
  if (status === "voided") return "destructive" as const;
  return "outline" as const;
}

function buildRelatedDocumentLinks(invoice: PrintableInvoiceData) {
  const links: Array<{
    label: string;
    reference: string;
    relation: string;
  }> = [];

  const pushLink = (input: {
    label: string;
    reference: string | null | undefined;
    relation: string;
  }) => {
    if (!input.reference || input.reference === invoice.reference) return;
    if (links.some((entry) => entry.reference === input.reference)) return;

    links.push({
      label: input.label,
      reference: input.reference,
      relation: input.relation,
    });
  };

  pushLink({
    label: "Source invoice",
    reference:
      invoice.parentInvoiceReference ??
      invoice.revisionChain?.sourceInvoiceReference,
    relation: "Origin",
  });
  pushLink({
    label: "Revision root",
    reference: invoice.revisionChain?.revisionRootReference,
    relation: "Chain root",
  });
  pushLink({
    label: "Credit note",
    reference: invoice.revisionChain?.revisionCreditNoteReference,
    relation: "Adjustment",
  });
  pushLink({
    label: "Replacement invoice",
    reference:
      invoice.replacementInvoiceReference ??
      invoice.revisionChain?.replacementInvoiceReference,
    relation: "Revision",
  });
  pushLink({
    label: "Latest payable",
    reference: invoice.revisionChain?.currentPayableReference,
    relation: "Source of truth",
  });

  return links;
}

function DocumentChainCard({
  detailBasePath,
  isLast,
  link,
}: {
  detailBasePath: string;
  isLast: boolean;
  link: {
    label: string;
    reference: string;
    relation: string;
  };
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Link
        className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl border border-border/60 bg-muted/15 p-4 transition-colors hover:bg-muted/35"
        href={toRoute(
          `${detailBasePath}/${encodeURIComponent(link.reference)}`,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="type-data-label">{link.label}</p>
            <p className="type-data-value mt-1 text-base">
              {formatPublicReference(link.reference)}
            </p>
          </div>
          <Badge variant={chainRelationVariant(link.relation)}>
            {link.relation}
          </Badge>
        </div>
      </Link>
      {!isLast ? (
        <div className="hidden shrink-0 text-muted-foreground xl:flex">
          <ArrowRight className="size-5" />
        </div>
      ) : null}
    </div>
  );
}

function chainRelationVariant(relation: string) {
  switch (relation) {
    case "Origin":
      return "destructive" as const;
    case "Adjustment":
      return "secondary" as const;
    case "Revision":
    case "Source of truth":
      return "default" as const;
    default:
      return "outline" as const;
  }
}

function getDocumentChainSummary(invoice: PrintableInvoiceData) {
  if (invoice.revisionChain?.isLatestPayable) {
    return {
      currentPayableReference: null,
      description:
        "Use this document as the current payable reference for settlement and reporting.",
      title: "This is the latest payable document.",
    };
  }

  const currentPayableReference =
    invoice.revisionChain?.currentPayableReference ?? null;

  if (invoice.replacementInvoiceReference) {
    return {
      currentPayableReference,
      description: `A replacement invoice was issued under ${formatPublicReference(invoice.replacementInvoiceReference)}.`,
      title: "This document has been revised.",
    };
  }

  if (invoice.type === "credit_note" && invoice.parentInvoiceReference) {
    return {
      currentPayableReference,
      description: `This credit note adjusts ${formatPublicReference(invoice.parentInvoiceReference)} and forms part of the revision chain.`,
      title: "This document records an adjustment.",
    };
  }

  if (invoice.parentInvoiceReference) {
    return {
      currentPayableReference,
      description: `This document was issued from ${formatPublicReference(invoice.parentInvoiceReference)}.`,
      title: "This document is linked to an earlier sale record.",
    };
  }

  return null;
}
