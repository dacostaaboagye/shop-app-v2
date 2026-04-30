"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatPublicReference } from "@/lib/display/format";
import type { PrintableInvoiceData } from "@/lib/documents/sales-document";
import { toRoute } from "@/lib/routes";

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

export function DocumentChainSummary({
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
