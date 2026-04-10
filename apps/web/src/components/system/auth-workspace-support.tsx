"use client";

import type { AuthUser } from "@shop/contracts";
import { LockKeyhole, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const anonymousGuidance = [
  {
    description:
      "Create an account with your first name, last name, email, and password.",
    title: "Create your account",
  },
  {
    description:
      "Too many failed attempts trigger a temporary lock with a clear retry window.",
    title: "Sign-in stays protected",
  },
  {
    description:
      "If an admin deactivates the account, the next protected action closes access immediately.",
    title: "Access updates quickly",
  },
];

export function AuthLoadingCard() {
  return (
    <Card className="surface-card">
      <CardHeader className="gap-3">
        <div className="eyebrow-block">
          <p className="editorial-kicker">Session bootstrap</p>
          <CardTitle>Checking for an active session</CardTitle>
          <CardDescription>
            The app is checking whether a secure sign-in session can be
            restored.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-5/6" />
      </CardContent>
    </Card>
  );
}

export function AuthAnonymousGuidance() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {anonymousGuidance.map((item) => (
        <div
          key={item.title}
          className="rounded-lg border border-border/80 bg-muted/35 p-4"
        >
          <p className="text-sm font-medium">{item.title}</p>
          <p className="support-copy mt-2 text-sm">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

export function AuthSessionHighlights({ user }: { user: AuthUser }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <HighlightPanel
        description={user.email}
        icon="status"
        title="Signed in as"
      />
      <HighlightPanel
        description={
          user.preferredPortal ?? "No destination has been chosen yet"
        }
        icon="portal"
        title="Preferred destination"
      />
      <HighlightPanel
        description="Protected actions re-check access instead of trusting an old screen forever."
        icon="revocation"
        title="Session safety"
      />
    </div>
  );
}

function HighlightPanel(props: {
  description: string;
  icon: "portal" | "revocation" | "status";
  title: string;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/35 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-secondary p-2 text-primary">
          {props.icon === "revocation" ? (
            <ShieldAlert className="size-4" />
          ) : props.icon === "portal" ? (
            <LockKeyhole className="size-4" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{props.title}</p>
          <p className="support-copy text-sm">{props.description}</p>
        </div>
      </div>
    </div>
  );
}
