"use client";

import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { MessageSquareText, PackageSearch, ShoppingCart } from "lucide-react";
import type { ReactNode } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCount,
  formatPublicReference,
  formatSupportText,
} from "@/lib/display/format";
import { fetchSupplierPortalProfile } from "@/lib/react-query/admin-directory";

type SupplierPortalView = "catalogue" | "dashboard" | "inquiries" | "orders";

type SupplierStatusTone = "default" | "secondary";

export function SupplierPortalClient({ view }: { view: SupplierPortalView }) {
  const query = useQuery({
    queryFn: fetchSupplierPortalProfile,
    queryKey: ["supplier", "profile"],
  });

  if (query.isPending) {
    return (
      <PageShell>
        <PageHeader
          description="Loading your supplier account workspace."
          title="Supplier Portal"
        />
      </PageShell>
    );
  }

  if (query.isError) {
    return (
      <PageShell>
        <AppErrorBanner
          detail="Could not load your supplier account."
          error={query.error}
          onRetry={() => void query.refetch()}
          title="Supplier account unavailable"
        />
      </PageShell>
    );
  }

  const supplier = query.data;

  return (
    <PageShell>
      <PageHeader
        {...(supplier.legalName || supplier.email
          ? {
              description: formatSupportText(
                supplier.legalName ?? supplier.email,
              ),
            }
          : {})}
        title={supplier.name}
      />

      {view === "dashboard" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            description="Products currently linked to your supplier account."
            icon={PackageSearch}
            label="Products"
            value={formatCount(supplier.products.length)}
          />
          <StatCard
            description="Purchase orders that still need supplier attention."
            icon={ShoppingCart}
            label="Orders"
            value={formatCount(supplier.procurementOrders.length)}
          />
          <StatCard
            description="Sourcing requests shared with your supplier account."
            icon={MessageSquareText}
            label="Inquiries"
            value={formatCount(supplier.inquiries.length)}
          />
        </div>
      ) : null}

      {view === "catalogue" ? (
        <SupplierWorkspaceCard
          description={`${formatCount(supplier.products.length)} linked products`}
          title="Catalogue"
        >
          {supplier.products.length === 0 ? (
            <AppEmptyState
              description="No products are linked to your supplier account yet."
              icon={PackageSearch}
              kind="no-data"
              title="No Products"
            />
          ) : (
            supplier.products.map((product) => (
              <SupplierListRow
                key={product.productSlug}
                icon={PackageSearch}
                meta={`${formatCount(product.variantCount)} SKU${product.variantCount === 1 ? "" : "s"}`}
                title={product.productName}
              />
            ))
          )}
        </SupplierWorkspaceCard>
      ) : null}

      {view === "orders" ? (
        <SupplierWorkspaceCard
          description={`${formatCount(supplier.procurementOrders.length)} purchase orders`}
          title="Purchase Orders"
        >
          {supplier.procurementOrders.length === 0 ? (
            <AppEmptyState
              description="Purchase orders issued to your supplier account will appear here."
              icon={ShoppingCart}
              kind="no-data"
              title="No Purchase Orders"
            />
          ) : (
            supplier.procurementOrders.map((order) => (
              <SupplierListRow
                key={order.reference}
                icon={ShoppingCart}
                meta={`${formatCount(order.lines.length)} line${order.lines.length === 1 ? "" : "s"}`}
                status={formatSupplierStatus(order.status)}
                statusTone="secondary"
                title={formatPublicReference(order.reference)}
              />
            ))
          )}
        </SupplierWorkspaceCard>
      ) : null}

      {view === "inquiries" ? (
        <SupplierWorkspaceCard
          description={`${formatCount(supplier.inquiries.length)} sourcing inquiries`}
          title="Sourcing Inquiries"
        >
          {supplier.inquiries.length === 0 ? (
            <AppEmptyState
              description="Availability and sourcing questions from the business will appear here."
              icon={MessageSquareText}
              kind="no-data"
              title="No Inquiries"
            />
          ) : (
            supplier.inquiries.map((inquiry) => (
              <SupplierListRow
                key={inquiry.reference}
                icon={MessageSquareText}
                meta={formatSupportText(
                  inquiry.productName ??
                    inquiry.requestedProductName ??
                    "External sourcing request",
                )}
                status={formatSupplierStatus(inquiry.status)}
                title={formatPublicReference(inquiry.reference)}
              />
            ))
          )}
        </SupplierWorkspaceCard>
      ) : null}
    </PageShell>
  );
}

function SupplierWorkspaceCard(props: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <Card className="border-none bg-card shadow-sm ring-1 ring-border">
      <CardHeader className="gap-1 border-b border-border bg-card">
        <CardTitle>{props.title}</CardTitle>
        {props.description ? (
          <p className="type-support">{props.description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-6">
        {props.children}
      </CardContent>
    </Card>
  );
}

function SupplierListRow(props: {
  icon: LucideIcon;
  meta: string;
  status?: string;
  statusTone?: SupplierStatusTone;
  title: string;
}) {
  const Icon = props.icon;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-balance text-sm font-semibold">{props.title}</p>
          <p className="type-support mt-1 text-pretty">{props.meta}</p>
        </div>
      </div>
      {props.status ? (
        <Badge variant={props.statusTone ?? "outline"}>{props.status}</Badge>
      ) : null}
    </div>
  );
}

function formatSupplierStatus(value: string) {
  return value
    .split("_")
    .map((segment) =>
      segment.length > 0
        ? `${segment.charAt(0).toUpperCase()}${segment.slice(1).toLowerCase()}`
        : segment,
    )
    .join(" ");
}
