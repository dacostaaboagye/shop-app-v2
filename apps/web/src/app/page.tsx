import {
  ArrowRight,
  LayoutTemplate,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { FoundationSnapshot } from "@/components/system/foundation-snapshot";
import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const foundationPillars = [
  "Immutable ownership ledger before attribution or reporting",
  "Permission resolution service before protected feature APIs",
  "Slug and reference infrastructure before external-facing routes",
  "Row-level locking for reservation and stock mutations",
  "CI guardrails that stop route and DTO drift",
];

const moduleBoundaries = [
  "Identity and access control",
  "Inventory ownership and accountability",
  "Stock balances and reservations",
  "Locations and physical topology",
  "Catalog and supplier-scoped views",
  "Deliveries and fulfillment",
];

export default function HomePage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Frontend and Architecture Baseline"
        title="Build the hard parts first."
        description="The workbook is clear about the risk surface: ownership, permissions, stock reservations, and public identifiers are foundational. This v2 repo is structured to protect those decisions while giving future agents a reusable, opinionated frontend system."
        badges={[
          "Next 16 + shadcn base-nova",
          "React Query + Zustand",
          "TanStack Table + Form",
          "Responsive by default",
          "Structured error states",
          "Design-token driven",
        ]}
        actions={
          <>
            <Link className={buttonVariants({ size: "lg" })} href="/login">
              Explore the auth surface
              <ArrowRight data-icon="inline-end" />
            </Link>
            <Link
              className={buttonVariants({ size: "lg", variant: "outline" })}
              href="/no-access"
            >
              View no-access handling
            </Link>
          </>
        }
        aside={
          <InsightCard
            eyebrow="Design Direction"
            title="Editorial warmth over generic SaaS polish"
            description="The frontend baseline is intentionally calm, tactile, and operational."
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="text-primary" />
                <p className="support-copy text-sm">
                  Shadcn gives us source-controlled primitives; house wrappers
                  and tokens define the actual product language.
                </p>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <ShieldCheck className="text-primary" />
                <p className="support-copy text-sm">
                  Error, empty, and loading states are first-class parts of the
                  UI contract.
                </p>
              </div>
            </div>
          </InsightCard>
        }
      />

      <section className="panel-grid">
        <InsightCard
          eyebrow="Execution Order"
          title="Foundation tickets come first"
          description="We build irreversible correctness before velocity."
        >
          <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm text-muted-foreground">
            {foundationPillars.map((pillar) => (
              <li key={pillar}>{pillar}</li>
            ))}
          </ol>
        </InsightCard>

        <InsightCard
          eyebrow="Module Map"
          title="Boundaries are explicit"
          description="Each frontend and backend area has a clear owner and extension point."
        >
          <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
            {moduleBoundaries.map((moduleName) => (
              <li key={moduleName} className="flex items-start gap-3">
                <LayoutTemplate className="text-primary" />
                <span>{moduleName}</span>
              </li>
            ))}
          </ul>
        </InsightCard>
      </section>

      <FoundationSnapshot />
    </PageShell>
  );
}
