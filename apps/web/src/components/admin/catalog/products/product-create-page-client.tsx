"use client";

import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toRoute } from "@/lib/routes";
import { ProductCreateForm } from "./product-create-form";

export function ProductCreatePageClient() {
  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/products")}
        backLabel="Products"
        description="Register a new product. Configure options and variants after creation."
        title="New product"
      />
      <Card className="border-border/70 bg-card shadow-none">
        <CardHeader>
          <CardTitle>Product details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductCreateForm />
        </CardContent>
      </Card>
    </PageShell>
  );
}
