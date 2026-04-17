"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
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
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-8 w-8" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
