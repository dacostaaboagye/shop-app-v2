"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AuthCard, AuthCardBody } from "./auth-surfaces";

export function AuthLoadingCard() {
  return (
    <AuthCard>
      <AuthCardBody>
        <div className="flex flex-col gap-4 py-10">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-5/6 rounded-xl" />
          <Skeleton className="h-10 w-4/6 rounded-xl" />
        </div>
      </AuthCardBody>
    </AuthCard>
  );
}
