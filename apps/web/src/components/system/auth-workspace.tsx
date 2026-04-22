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
    <div className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/60 p-10 backdrop-blur-xl shadow-2xl shadow-black/5">
      <div className="mb-10 flex flex-col items-center gap-2 text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {content.title}
        </h2>
        <p className="text-base text-muted-foreground">
          {content.description}
        </p>
      </div>
      
      <div className="flex flex-col gap-6">
        {sessionNotice ? (
          <AppBanner
            description={sessionNotice}
            icon={ShieldAlert}
            title="Session ended"
            tone="warning"
          />
        ) : null}

        {mode === "login" ? <AuthLoginForm /> : <AuthRegisterForm />}

        <div className="mt-4 flex items-center justify-center gap-2 border-t border-border/20 pt-8 text-sm font-medium text-muted-foreground">
          {content.linkPrompt}{" "}
          <Link
            className="font-bold text-primary transition-colors hover:text-primary/80"
            href={content.alternateHref}
          >
            {content.alternateLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
