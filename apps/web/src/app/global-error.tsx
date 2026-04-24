"use client";

import Link from "next/link";
import { AppErrorState } from "@/components/system/app-error";
import { PageShell } from "@/components/system/page-shell";
import { buttonVariants } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <html lang="en">
      <body>
        <PageShell className="justify-center">
          <AppErrorState
            action={
              <Link
                className={buttonVariants({ size: "lg", variant: "outline" })}
                href="/"
              >
                Return home
              </Link>
            }
            detail="An unexpected error occurred while rendering this page."
            error={error}
            onRetry={reset}
            title="Something went wrong"
          />
        </PageShell>
      </body>
    </html>
  );
}
