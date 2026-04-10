import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

export default function SupplierCataloguePage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Catalogue"
        title="Your supplier product catalogue"
        description="Products and variants you supply to this platform. Catalogue management and pricing tools land with the supplier backlog."
        badges={["Supplier backlog"]}
        aside={
          <InsightCard
            eyebrow="Planned scope"
            title="Products you supply"
            description="Your listed products, variant details, stock availability submissions, and pricing will be managed from this surface."
          >
            <p className="text-sm text-muted-foreground">
              This surface requires{" "}
              <code className="text-xs">supplier.catalog.view</code> permission
              and is scoped to your supplier account.
            </p>
          </InsightCard>
        }
      />
    </PageShell>
  );
}
