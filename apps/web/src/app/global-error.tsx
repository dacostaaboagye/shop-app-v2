"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

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
          <Alert className="hero-panel border-border/80 bg-card/88 p-8">
            <RotateCcw />
            <AlertTitle>Something went wrong.</AlertTitle>
            <AlertDescription className="flex flex-col gap-5">
              <span>
                {error.message ||
                  "An unexpected error occurred while rendering this page."}
              </span>
              <div className="token-row">
                <Button onClick={reset} size="lg" type="button">
                  Try Again
                </Button>
                <Link
                  className={buttonVariants({ size: "lg", variant: "outline" })}
                  href="/"
                >
                  Return Home
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        </PageShell>
      </body>
    </html>
  );
}
