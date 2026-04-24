"use client";

import type React from "react";
import { createContext, useContext, useMemo } from "react";

type BrandingConfig = {
  primary?: string;
  secondary?: string;
  accent?: string;
};

const BrandingContext = createContext<BrandingConfig | null>(null);

export function BrandingProvider({
  children,
  config = {},
}: {
  children: React.ReactNode;
  config?: BrandingConfig;
}) {
  const style = useMemo(() => {
    const vars: Record<string, string> = {};
    if (config.primary) vars["--brand-primary"] = config.primary;
    if (config.secondary) vars["--brand-secondary"] = config.secondary;
    if (config.accent) vars["--brand-accent"] = config.accent;
    return vars as React.CSSProperties;
  }, [config]);

  return (
    <BrandingContext.Provider value={config}>
      <div style={style} className="contents">
        {children}
      </div>
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    return {};
  }
  return context;
}
