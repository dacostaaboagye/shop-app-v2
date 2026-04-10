import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

export default function AdminSuppliersPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Suppliers"
        title="Supplier account management"
        description="Create and manage supplier accounts, catalogue access, and purchase relationships. Supplier management lands with the supply chain backlog."
        badges={["Supply backlog"]}
        aside={
          <InsightCard
            eyebrow="Planned scope"
            title="Supplier onboarding and catalogues"
            description="Supplier registration, catalogue assignments, and pricing agreements will be managed from this surface."
          >
            <p className="text-sm text-muted-foreground">
              This surface requires{" "}
              <code className="text-xs">suppliers.view</code> permission and is
              visible only to admin roles.
            </p>
          </InsightCard>
        }
      />
    </PageShell>
  );
}
