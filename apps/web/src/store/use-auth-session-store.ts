"use client";

import type { AuthSession, AuthUser } from "@shop/contracts";
import { createUiStore } from "@/store/create-ui-store";

export type AuthSessionStatus =
  | "anonymous"
  | "authenticated"
  | "bootstrapping"
  | "refreshing";

type AuthSessionState = {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  clearSession: () => void;
  setRefreshing: () => void;
  setSession: (session: AuthSession) => void;
  setUser: (user: AuthUser) => void;
  status: AuthSessionStatus;
  user: AuthUser | null;
};

export const useAuthSessionStore = createUiStore<AuthSessionState>((set) => ({
  accessToken: null,
  accessTokenExpiresAt: null,
  clearSession: () =>
    set({
      accessToken: null,
      accessTokenExpiresAt: null,
      status: "anonymous",
      user: null,
    }),
  setRefreshing: () =>
    set((state) => ({
      status:
        state.status === "authenticated"
          ? "authenticated"
          : state.status === "bootstrapping"
            ? "bootstrapping"
            : "refreshing",
    })),
  setSession: (session) =>
    set({
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      status: "authenticated",
      user: session.user,
    }),
  setUser: (user) => set({ user }),
  status: "bootstrapping",
  user: null,
}));

export function isAuthSessionPending(status: AuthSessionStatus): boolean {
  return status === "bootstrapping" || status === "refreshing";
}
