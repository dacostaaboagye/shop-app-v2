"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthTransitionState } from "@/components/system/auth-transition-state";
import { refreshAccessToken } from "@/lib/auth/auth-client";
import { getPortalHref, getPrimaryPortal } from "@/lib/portals";
import { toRoute } from "@/lib/routes";

export default function AuthCallbackPage() {
  const { replace } = useRouter();

  useEffect(() => {
    refreshAccessToken()
      .then((session) => {
        if (!session) {
          replace(toRoute("/login"));
          return;
        }

        const portal = getPrimaryPortal(session.user);
        replace(portal ? getPortalHref(portal) : toRoute("/"));
      })
      .catch(() => {
        replace(toRoute("/login"));
      });
  }, [replace]);

  return (
    <AuthTransitionState
      description="We are confirming your session and sending you to the right workspace."
      title="Signing You In"
    />
  );
}
