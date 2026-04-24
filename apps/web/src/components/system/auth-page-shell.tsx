import { Warehouse } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  children: ReactNode;
};

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Clean background without theatrical glows */}

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Centered brand with new typography */}
        <div className="mb-12 flex flex-col items-center gap-4">
          <Link
            aria-label="Go to home"
            href="/"
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-sm transition-transform hover:scale-[1.02]"
          >
            <Warehouse className="h-7 w-7 text-primary-foreground" />
          </Link>
          <div className="text-center">
            <span className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Shop.
            </span>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/60">
              Inventory Systems
            </p>
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}
