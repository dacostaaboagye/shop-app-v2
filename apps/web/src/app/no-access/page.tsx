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

export default function NoAccessPage() {
  return (
    <PageShell className="justify-center">
      <Empty className="hero-panel border-border/80 bg-card/85 py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MailWarning />
          </EmptyMedia>
          <EmptyTitle>No active portal access.</EmptyTitle>
          <EmptyDescription>
            This route is reserved for the backlog scenario where a user
            authenticates successfully but no longer has any active roles or
            available portal destinations.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="token-row justify-center">
            <Link className={buttonVariants({ size: "lg" })} href="/">
              Return Home
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
