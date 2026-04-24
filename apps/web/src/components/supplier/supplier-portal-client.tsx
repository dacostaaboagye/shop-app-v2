"use client";

import { useQuery } from "@tanstack/react-query";
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
import { fetchSupplierPortalProfile } from "@/lib/react-query/admin-directory";

type SupplierPortalView = "catalogue" | "dashboard" | "inquiries" | "orders";

export function SupplierPortalClient({ view }: { view: SupplierPortalView }) {
  const query = useQuery({
    queryFn: fetchSupplierPortalProfile,
    queryKey: ["supplier", "profile"],
  });

  if (query.isPending) {
    return (
      <PageShell>
        <PageHeader title="Supplier portal" />
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
          ? { description: supplier.legalName ?? supplier.email ?? "" }
          : {})}
        title={supplier.name}
      />
      {view === "dashboard" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            description="Products linked to your supplier account."
            icon={PackageSearch}
            label="Products"
            value={supplier.products.length}
          />
          <StatCard
            description="Purchase orders in progress."
            icon={ShoppingCart}
            label="Orders"
            value={supplier.procurementOrders.length}
          />
          <StatCard
            description="Sourcing questions awaiting attention."
            icon={MessageSquareText}
            label="Inquiries"
            value={supplier.inquiries.length}
          />
        </div>
      ) : null}
      {view === "catalogue" ? (
        <SupplierCard title="Catalogue">
          {supplier.products.length === 0 ? (
            <AppEmptyState
              description="No products are linked to your supplier account yet."
              icon={PackageSearch}
              kind="no-data"
              title="No products"
            />
          ) : (
            supplier.products.map((product) => (
              <Row
                key={product.productSlug}
                meta={`${product.variantCount} SKU(s)`}
                title={product.productName}
              />
            ))
          )}
        </SupplierCard>
      ) : null}
      {view === "orders" ? (
        <SupplierCard title="Purchase orders">
          {supplier.procurementOrders.length === 0 ? (
            <AppEmptyState
              description="Purchase orders issued to your account will appear here."
              icon={ShoppingCart}
              kind="no-data"
              title="No purchase orders"
            />
          ) : (
            supplier.procurementOrders.map((order) => (
              <Row
                key={order.reference}
                meta={`${order.lines.length} line(s)`}
                status={order.status.replaceAll("_", " ")}
                title={order.reference}
              />
            ))
          )}
        </SupplierCard>
      ) : null}
      {view === "inquiries" ? (
        <SupplierCard title="Sourcing inquiries">
          {supplier.inquiries.length === 0 ? (
            <AppEmptyState
              description="Availability and sourcing questions from the business will appear here."
              icon={MessageSquareText}
              kind="no-data"
              title="No inquiries"
            />
          ) : (
            supplier.inquiries.map((inquiry) => (
              <Row
                key={inquiry.reference}
                meta={
                  inquiry.productName ??
                  inquiry.requestedProductName ??
                  "External sourcing request"
                }
                status={inquiry.status}
                title={inquiry.reference}
              />
            ))
          )}
        </SupplierCard>
      ) : null}
    </PageShell>
  );
}

function SupplierCard(props: { children: ReactNode; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {props.children}
      </CardContent>
    </Card>
  );
}

function Row(props: { meta: string; status?: string; title: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div>
        <p className="font-medium">{props.title}</p>
        <p className="text-sm text-muted-foreground">{props.meta}</p>
      </div>
      {props.status ? <Badge variant="outline">{props.status}</Badge> : null}
    </div>
  );
}
