import type { Route } from "next";
import Link from "next/link";
import { AppErrorState } from "@/components/system/app-error";
import { PageShell } from "@/components/system/page-shell";
import { buttonVariants } from "@/components/ui/button";

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
      <AppErrorState
        action={
          <Link className={buttonVariants({ size: "lg" })} href={actionHref}>
            {actionLabel}
          </Link>
        }
        detail={detail}
        title={title}
      />
    </PageShell>
  );
}
