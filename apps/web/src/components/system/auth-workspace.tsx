"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthLoginForm } from "@/components/forms/auth-login-form";
import { AuthRegisterForm } from "@/components/forms/auth-register-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPortalHref, getPrimaryPortal } from "@/lib/portals";
import { toRoute } from "@/lib/routes";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { AppBanner } from "./app-banner";
import {
  type AuthWorkspaceMode,
  anonymousCopy,
  useSafeRouter,
} from "./auth-workspace-router";
import { AuthLoadingCard } from "./auth-workspace-support";

type AuthWorkspaceProps = {
  mode?: AuthWorkspaceMode;
};

export function AuthWorkspace({ mode = "login" }: AuthWorkspaceProps) {
  const router = useSafeRouter();
  const status = useAuthSessionStore((state) => state.status);
  const user = useAuthSessionStore((state) => state.user);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && user) {
      wasAuthenticated.current = true;
      setSessionNotice(null);
      const primaryPortal = getPrimaryPortal(user);
      router.replace(
        primaryPortal ? getPortalHref(primaryPortal) : toRoute("/"),
      );
    }

    if (status === "anonymous" && wasAuthenticated.current) {
      wasAuthenticated.current = false;
      setSessionNotice("Your session ended. Sign in again to continue.");
    }
  }, [status, user, router]);

  if (status === "refreshing" || status === "authenticated") {
    return <AuthLoadingCard />;
  }

  const content = anonymousCopy[mode];

  return (
    <Card className="border border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-sans text-lg font-semibold">
          {content.title}
        </CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {sessionNotice ? (
          <AppBanner
            description={sessionNotice}
            icon={ShieldAlert}
            title="Session ended"
            tone="warning"
          />
        ) : null}

        {mode === "login" ? <AuthLoginForm /> : <AuthRegisterForm />}

        <p className="text-sm text-muted-foreground">
          {content.linkPrompt}{" "}
          <Link
            className={buttonVariants({ size: "sm", variant: "link" })}
            href={content.alternateHref}
          >
            {content.alternateLabel}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
