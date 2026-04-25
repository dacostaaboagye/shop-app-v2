import { ShieldAlert } from "lucide-react";
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
      <Empty className="rounded-xl border border-border/60 bg-card/80 px-5 py-14 shadow-sm backdrop-blur-sm">
        <EmptyHeader>
          <EmptyMedia
            className="size-11 rounded-xl bg-primary/10 text-primary ring-1 ring-border/60"
            variant="icon"
          >
            <ShieldAlert className="size-5" />
          </EmptyMedia>
          <EmptyTitle>You Do Not Have Access to This Page</EmptyTitle>
          <EmptyDescription>
            Your account can be signed in successfully and still be blocked here
            if this page sits outside your assigned workspace or you do not have
            the required permission.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="token-row justify-center">
            <Link
              className={buttonVariants({ size: "lg" })}
              href={toRoute("/")}
            >
              Return to Account Entry
            </Link>
            <Button size="lg" type="button" variant="outline">
              Contact Support
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </PageShell>
  );
}
