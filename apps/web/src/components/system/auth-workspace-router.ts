"use client";

import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useContext } from "react";

export type AuthWorkspaceMode = "login";

export const anonymousCopy: Record<
  AuthWorkspaceMode,
  {
    description: string;
    title: string;
  }
> = {
  login: {
    description: "Welcome back. Sign in to your account.",
    title: "Sign In",
  },
};

const TEST_ROUTER: AppRouterInstance = {
  back: () => {},
  forward: () => {},
  prefetch: async () => {},
  push: () => {},
  refresh: () => {},
  replace: () => {},
};

export function useSafeRouter() {
  return useContext(AppRouterContext) ?? TEST_ROUTER;
}
