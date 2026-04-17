import { MapPin, Package, Route } from "lucide-react";
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
    title: "Today's deliveries",
    description: "Orders assigned to you for the current shift.",
    Icon: Package,
    status: "Coming soon",
  },
  {
    title: "Route map",
    description: "Optimised stop sequence for your delivery run.",
    Icon: Route,
    status: "Coming soon",
  },
  {
    title: "Stop details",
    description: "Customer address, contact, and delivery notes.",
    Icon: MapPin,
    status: "Coming soon",
  },
];

export default function AgentPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Agent portal"
        title="Your deliveries and routes, at a glance"
        description="The agent workspace will surface your assigned deliveries, route sequence, and stop details once the delivery backlog lands."
        badges={["Agent portal"]}
        aside={
          <InsightCard
            eyebrow="Current state"
            title="Portal shell is ready"
            description="Authentication, permission filtering, and portal routing are fully wired — delivery-specific features land here next."
          >
            <p className="text-sm text-muted-foreground">
              Assignments and routes will be scoped to your agent account
              automatically.
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
