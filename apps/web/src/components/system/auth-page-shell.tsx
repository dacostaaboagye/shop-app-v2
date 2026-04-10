import { Warehouse } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  children: ReactNode;
};

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Centered brand */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Link
            aria-label="Go to home"
            href="/"
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary transition-opacity hover:opacity-85"
          >
            <Warehouse className="h-5 w-5 text-primary-foreground" />
          </Link>
          <span className="text-sm font-semibold text-foreground">Shop</span>
        </div>

        {children}
      </div>
    </main>
  );
}
