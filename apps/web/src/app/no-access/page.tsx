import { MailWarning } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/system/page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { toRoute } from "@/lib/routes";

export default function NoAccessPage() {
  return (
    <PageShell className="justify-center">
      <Empty className="hero-panel border-border/80 bg-card/85 py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MailWarning />
          </EmptyMedia>
          <EmptyTitle>You do not have access to this page.</EmptyTitle>
          <EmptyDescription>
            Your account may be signed in successfully and still be blocked here
            if the current route is outside your assigned workspace or you do
            not have the required view permission for this page.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="token-row justify-center">
            <Link
              className={buttonVariants({ size: "lg" })}
              href={toRoute("/")}
            >
              Return to account entry
            </Link>
            <Button size="lg" variant="outline">
              Contact Support
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </PageShell>
  );
}
