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
    description: string;
    linkPrompt: string;
    title: string;
  }
> = {
  login: {
    alternateHref: "/register",
    alternateLabel: "Create Account",
    description: "Welcome back. Sign in to your account.",
    linkPrompt: "No account?",
    title: "Sign In",
  },
  register: {
    alternateHref: "/login",
    alternateLabel: "Sign In",
    description: "Create your account in seconds.",
    linkPrompt: "Already have an account?",
    title: "Create Account",
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
