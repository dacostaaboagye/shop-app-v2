"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthTransitionState } from "@/components/system/auth-transition-state";
import { refreshAccessToken } from "@/lib/auth/auth-client";
import { buildLoginHrefWithOAuthError } from "@/lib/auth/oauth-error";
import { getPortalLandingHref } from "@/lib/portals";
import { toRoute } from "@/lib/routes";

type AuthCallbackPageClientProps = {
  oauthError?: string | null;
};

export function AuthCallbackPageClient({
  oauthError = null,
}: AuthCallbackPageClientProps) {
  const { replace } = useRouter();

  useEffect(() => {
    if (oauthError) {
      replace(buildLoginHrefWithOAuthError(oauthError));
      return;
    }

    refreshAccessToken()
      .then((session) => {
        if (!session) {
          replace(toRoute("/login"));
          return;
        }

        replace(getPortalLandingHref(session.user));
      })
      .catch(() => {
        replace(toRoute("/login"));
      });
  }, [oauthError, replace]);

  return (
    <AuthTransitionState
      description="We are confirming your session and sending you to the right workspace."
      title="Signing You In"
    />
  );
}
