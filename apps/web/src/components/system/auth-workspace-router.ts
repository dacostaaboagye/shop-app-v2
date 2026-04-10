"use client";

import type { Route } from "next";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useContext } from "react";

export type AuthWorkspaceMode = "login" | "register";

export const anonymousCopy: Record<
  AuthWorkspaceMode,
  {
    alternateHref: Route;
    alternateLabel: string;
    linkPrompt: string;
    title: string;
  }
> = {
  login: {
    alternateHref: "/register",
    alternateLabel: "Create account",
    linkPrompt: "No account?",
    title: "Sign in",
  },
  register: {
    alternateHref: "/login",
    alternateLabel: "Sign in",
    linkPrompt: "Already have an account?",
    title: "Create account",
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
