import { ClipboardList, Package } from "lucide-react";
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
    title: "Assigned stock",
    description: "Product variants currently under your responsibility.",
    Icon: Package,
    status: "Coming soon",
  },
  {
    title: "Tasks",
    description: "Actions and handover requests requiring attention.",
    Icon: ClipboardList,
    status: "Coming soon",
  },
];

export default function WorkerPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Worker portal"
        title="Assigned work without admin noise"
        description="Workers need a narrower, faster workspace centered on individual responsibility. This route keeps that focus while still living inside the shared staff shell."
        badges={["Role-scoped workspace"]}
        aside={
          <InsightCard
            eyebrow="Intent"
            title="Focused by design"
            description="The worker surface stays intentionally lighter than admin and manager routes."
          >
            <p className="text-sm text-muted-foreground">
              Navigation and account controls are shared, but the page rhythm is
              kept tighter around task execution.
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
