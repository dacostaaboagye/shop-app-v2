import { Warehouse } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  children: ReactNode;
};

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Dynamic background element */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-[100px]" />
      
      <div className="relative z-10 w-full max-w-[420px]">
        {/* Centered brand with new typography */}
        <div className="mb-12 flex flex-col items-center gap-4">
          <Link
            aria-label="Go to home"
            href="/"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/30 transition-transform hover:scale-105"
          >
            <Warehouse className="h-7 w-7 text-primary-foreground" />
          </Link>
          <div className="text-center">
            <span className="font-heading text-3xl font-bold tracking-tight text-foreground">Shop.</span>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/60">Inventory Systems</p>
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}
