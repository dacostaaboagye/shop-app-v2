"use client";

import { useEffect } from "react";
import { refreshAccessToken } from "@/lib/auth/auth-client";

export function AuthSessionBootstrap() {
  useEffect(() => {
    void refreshAccessToken().catch(() => undefined);
  }, []);

  return null;
}
