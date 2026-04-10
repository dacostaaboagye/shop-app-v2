import { FileText, PackageSearch, Tag } from "lucide-react";
import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const sections = [
  {
    title: "Open purchase orders",
    description: "Orders awaiting fulfilment or confirmation from your end.",
    Icon: FileText,
    status: "Coming soon",
  },
  {
    title: "Catalogue management",
    description: "Products and variants you supply to this platform.",
    Icon: PackageSearch,
    status: "Coming soon",
  },
  {
    title: "Pricing and terms",
    description: "Active pricing agreements and contract terms.",
    Icon: Tag,
    status: "Coming soon",
  },
];

export default function SupplierPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Supplier portal"
        title="Manage orders and your catalogue in one place"
        description="The supplier workspace will consolidate purchase orders, catalogue management, and pricing agreements once the supplier backlog lands."
        badges={["Supplier portal"]}
        aside={
          <InsightCard
            eyebrow="Current state"
            title="Portal shell is ready"
            description="Authentication, permission filtering, and portal routing are all wired up — supplier-specific features land here next."
          >
            <p className="text-sm text-muted-foreground">
              Order fulfilment and catalogue management will be scoped to your
              supplier account automatically.
            </p>
          </InsightCard>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ title, description, Icon, status }) => (
          <Card
            key={title}
            className="border border-border bg-card shadow-none"
          >
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <CardTitle className="font-sans text-base font-semibold">
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">{status}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
