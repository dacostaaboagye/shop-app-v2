"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { type CSSProperties, createContext, useContext, useMemo } from "react";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import { useAuthSessionStore } from "@/store/use-auth-session-store";

type BrandingConfig = {
  accent: string;
  brandName: string;
  logoImageUrl: string | null;
  logoText: string;
  primary: string;
};

type BrandingStyle = CSSProperties & Record<`--${string}`, string>;

const BrandingContext = createContext<BrandingConfig>({
  accent: DEFAULT_OFFICIAL_DOCUMENT_PROFILE.accentColor,
  brandName: DEFAULT_OFFICIAL_DOCUMENT_PROFILE.brandName,
  logoImageUrl: DEFAULT_OFFICIAL_DOCUMENT_PROFILE.logoImageUrl,
  logoText: DEFAULT_OFFICIAL_DOCUMENT_PROFILE.logoText,
  primary: DEFAULT_OFFICIAL_DOCUMENT_PROFILE.primaryColor,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const status = useAuthSessionStore((state) => state.status);
  const profileQuery = useQuery({
    enabled: status === "authenticated",
    queryFn: () => fetchOfficialDocumentProfile(),
    queryKey: officialDocumentProfileQueryKey(),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const config = useMemo<BrandingConfig>(() => {
    const profile = profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;
    return {
      accent: profile.accentColor,
      brandName: profile.brandName,
      logoImageUrl: profile.logoImageUrl,
      logoText: profile.logoText,
      primary: profile.primaryColor,
    };
  }, [profileQuery.data]);

  const style = useMemo<BrandingStyle>(
    () => ({
      "--accent": config.accent,
      "--brand-accent": config.accent,
      "--brand-accent-soft": `color-mix(in oklch, ${config.accent} 18%, var(--card))`,
      "--brand-logo-mark-accent": config.accent,
      "--brand-logo-mark-background": config.primary,
      "--primary": config.primary,
      "--brand-primary": config.primary,
      "--brand-primary-soft": `color-mix(in oklch, ${config.primary} 14%, var(--card))`,
      "--brand-secondary": `color-mix(in oklch, ${config.primary} 10%, var(--background))`,
      "--kicker-foreground": config.primary,
      "--ring": config.primary,
      "--sidebar-primary": config.primary,
      "--sidebar-ring": config.primary,
    }),
    [config],
  );

  return (
    <BrandingContext.Provider value={config}>
      <div className="contents" style={style}>
        {children}
      </div>
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
