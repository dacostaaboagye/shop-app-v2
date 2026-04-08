import { TriangleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { PageShell } from "@/components/system/page-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type ErrorViewProps = {
  actionHref?: Route;
  actionLabel?: string;
  detail: string;
  title: string;
};

export function ErrorView({
  title,
  detail,
  actionLabel = "Return Home",
  actionHref = "/",
}: ErrorViewProps) {
  return (
    <PageShell className="justify-center">
      <Empty className="hero-panel border-border/80 bg-card/85 py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{detail}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link className={buttonVariants({ size: "lg" })} href={actionHref}>
            {actionLabel}
          </Link>
        </EmptyContent>
      </Empty>
    </PageShell>
  );
}
