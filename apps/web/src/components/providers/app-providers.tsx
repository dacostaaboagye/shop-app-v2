"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { AuthSessionBootstrap } from "@/components/providers/auth-session-bootstrap";
import { createQueryClient } from "@/lib/react-query/query-client";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionBootstrap />
      {children}
    </QueryClientProvider>
  );
}
