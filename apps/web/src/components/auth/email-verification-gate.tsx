"use client";

import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { useAuthSessionStore } from "@/store/use-auth-session-store";

export function EmailVerificationGate() {
  const user = useAuthSessionStore((state) => state.user);
  const status = useAuthSessionStore((state) => state.status);

  if (status !== "authenticated" || !user || user.emailVerified) {
    return null;
  }

  return <EmailVerificationBanner />;
}
