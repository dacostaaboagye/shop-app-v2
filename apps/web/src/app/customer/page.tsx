import { History, ReceiptText, ShoppingBag } from "lucide-react";
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
    title: "Invoices",
    description: "Official invoices linked to your customer account.",
    Icon: ReceiptText,
    status: "Available through customer access",
  },
  {
    title: "Orders",
    description: "Order history and fulfilment progress.",
    Icon: ShoppingBag,
    status: "Coming soon",
  },
  {
    title: "Account history",
    description: "Relationship updates and account activity.",
    Icon: History,
    status: "Coming soon",
  },
];

export default function CustomerPage() {
  return (
    <PageShell>
      <HeroPanel
        aside={
          <InsightCard
            eyebrow="Access"
            title="Linked by customer contact"
            description="Your customer account is available when an administrator links your user profile to an active CRM contact."
          >
            <p className="text-sm text-muted-foreground">
              Revoking that link removes customer account access immediately.
            </p>
          </InsightCard>
        }
        badges={["Customer portal"]}
        description="View customer documents and account updates from one workspace."
        eyebrow="Customer portal"
        title="Your account documents"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ title, description, Icon, status }) => (
          <Card
            className="border border-border bg-card shadow-none"
            key={title}
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
