import { ShieldCheck } from "lucide-react";
import { LoginPreviewForm } from "@/components/forms/login-preview-form";
import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Identity Surface"
        title="Login should feel deliberate, not provisional."
        description="The actual feature will layer in password strength, lockout handling, refresh-token invalidation, and portal routing. This placeholder already uses the form composition, spacing, and fallback primitives we expect future auth work to keep."
        badges={[
          "FieldGroup composition",
          "Accessible controls",
          "Failure-first design",
        ]}
      />

      <section className="panel-grid">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Authentication Preview</CardTitle>
            <CardDescription>
              Agents should build auth flows with TanStack Form, shared field
              wrappers, and structured failure handling.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <LoginPreviewForm />
            <Separator />
            <Alert>
              <ShieldCheck />
              <AlertTitle>Resilience requirement</AlertTitle>
              <AlertDescription>
                The final auth surface must handle locked, deactivated, and
                expired-session states without leaking unsafe detail.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <InsightCard
          eyebrow="Agent Rule"
          title="Every form must ship with failure states"
          description="No frontend task is complete if the only happy path is visually designed."
        >
          <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
            <li>Submit through TanStack Form, not local `useState` islands.</li>
            <li>Show pending state and prevent double submit.</li>
            <li>
              Use shared problem-details messaging and safe recovery copy.
            </li>
            <li>Keep the layout usable at 320px.</li>
          </ul>
        </InsightCard>
      </section>
    </PageShell>
  );
}
