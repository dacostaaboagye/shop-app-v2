import { AlertTriangle, ArrowLeftRight, BarChart2, Users } from "lucide-react";
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
    title: "Stock health",
    description: "Live balance and low-stock alerts for this location.",
    Icon: BarChart2,
    status: "Coming soon",
  },
  {
    title: "Low-stock alerts",
    description: "Variants below threshold that need restocking.",
    Icon: AlertTriangle,
    status: "Coming soon",
  },
  {
    title: "Assigned staff",
    description: "Workers currently active at this location.",
    Icon: Users,
    status: "Coming soon",
  },
  {
    title: "Pending transfers",
    description: "Stock transfers awaiting confirmation.",
    Icon: ArrowLeftRight,
    status: "Coming soon",
  },
];

export default function ManagerPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Manager portal"
        title="Location operations at a glance"
        description="Managers should land in a location-scoped workspace, not a diluted admin copy. This route is shaped for the real-time overview backlog that comes next."
        badges={["E-02-02"]}
        aside={
          <InsightCard
            eyebrow="Intent"
            title="One location, one operating context"
            description="Stock health, transfer pressure, staff visibility, and recent activity will converge here."
          >
            <p className="text-sm text-muted-foreground">
              The shared shell stays consistent, but the landing page is tuned
              to operational summaries rather than system administration.
            </p>
          </InsightCard>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
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
