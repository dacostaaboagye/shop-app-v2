"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AuthLoginForm } from "@/components/forms/auth-login-form";
import { resolvePostLoginHref } from "@/lib/auth/auth-redirect";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { AppBanner } from "./app-banner";
import { AuthCard, AuthCardBody, AuthCardHeader } from "./auth-surfaces";
import {
  type AuthWorkspaceMode,
  anonymousCopy,
  useSafeRouter,
} from "./auth-workspace-router";
import { AuthLoadingCard } from "./auth-workspace-support";

type AuthWorkspaceProps = {
  mode?: AuthWorkspaceMode;
  nextPath?: string | null;
};

export function AuthWorkspace({
  mode = "login",
  nextPath = null,
}: AuthWorkspaceProps) {
  const router = useSafeRouter();
  const status = useAuthSessionStore((state) => state.status);
  const user = useAuthSessionStore((state) => state.user);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && user) {
      wasAuthenticated.current = true;
      setSessionNotice(null);
      router.replace(resolvePostLoginHref(user, nextPath));
    }

    if (status === "anonymous" && wasAuthenticated.current) {
      wasAuthenticated.current = false;
      setSessionNotice("Your session ended. Sign in again to continue.");
    }
  }, [nextPath, router, status, user]);

  if (status === "refreshing" || status === "authenticated") {
    return <AuthLoadingCard />;
  }

  const content = anonymousCopy[mode];

  return (
    <AuthCard>
      <AuthCardHeader description={content.description} title={content.title} />
      <AuthCardBody>
        {sessionNotice ? (
          <AppBanner
            description={sessionNotice}
            icon={ShieldAlert}
            title="Session ended"
            tone="warning"
          />
        ) : null}

        <AuthLoginForm />
      </AuthCardBody>
    </AuthCard>
  );
}
