"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { EmailVerificationGate } from "@/components/auth/email-verification-gate";
import { NotificationLiveProvider } from "@/components/providers/notification-live-provider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AppAccountDialog } from "./portal-account-dialog";
import { AppNotificationsDialog } from "./portal-overlays";
import { AppSidebar } from "./portal-sidebar";
import { AppTopbar } from "./portal-topbar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (pathname) {
      setMobileNavOpen(false);
    }
  }, [pathname]);

  return (
    <div className="min-h-svh bg-muted/20 selection:bg-primary/10">
      <NotificationLiveProvider />
      
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <AppSidebar onAccountOpen={() => setAccountOpen(true)} />
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[18.5rem] max-w-[88vw] bg-sidebar p-0 border-r-0 shadow-2xl"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>
              Navigate within the application.
            </SheetDescription>
          </SheetHeader>
          <AppSidebar
            onAccountOpen={() => setAccountOpen(true)}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="relative min-h-svh lg:pl-72">
        {/* High-Fidelity Luminous Mesh Architectural Header */}
        <div className="absolute inset-x-0 top-0 h-[420px] lg:pl-72 overflow-hidden border-b border-slate-200/40 bg-white">
          {/* Multi-Point Mesh Gradient (Atmospheric depth) */}
          <div className="absolute inset-0 bg-[radial-gradient(at_0%_0%,rgba(var(--primary-rgb),0.04)_0px,transparent_50%),radial-gradient(at_100%_0%,rgba(15,23,42,0.03)_0px,transparent_50%),radial-gradient(at_50%_0%,rgba(var(--primary-rgb),0.02)_0px,transparent_50%),radial-gradient(at_0%_100%,rgba(245,158,11,0.02)_0px,transparent_50%),radial-gradient(at_100%_100%,rgba(var(--primary-rgb),0.03)_0px,transparent_50%)]" />
          
          {/* Precision Dot Grid (Technical anchor) */}
          <div className="absolute inset-0 opacity-[0.08]" 
               style={{ backgroundImage: `radial-gradient(#94a3b8 0.5px, transparent 0.5px)`, backgroundSize: `24px 24px` }} />
          
          {/* Dynamic Light Orbs */}
          <div className="absolute -left-24 -top-24 size-[600px] rounded-full bg-primary/5 blur-[140px]" />
          <div className="absolute left-1/3 top-0 size-[400px] rounded-full bg-slate-200/30 blur-[100px]" />
          <div className="absolute -right-20 top-20 size-[500px] rounded-full bg-amber-500/5 blur-[120px]" />
          
          {/* Micro-Grain Texture Overlay (Tactile feel) */}
          <div className="absolute inset-0 opacity-[0.4] mix-blend-overlay" 
               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
          
          {/* Glass Refraction Border (Bottom edge) */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-50" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent" />
        </div>
        
        <AppTopbar
          pathname={pathname}
          onAccountOpen={() => setAccountOpen(true)}
          onMenuOpen={() => setMobileNavOpen(true)}
          onNotificationsOpen={() => setNotificationsOpen(true)}
        />
        
        <main className="relative z-10 px-6 sm:px-10 lg:px-12">
          <EmailVerificationGate />
          <div className="mx-auto max-w-screen-2xl pb-20">
            {children}
          </div>
        </main>
      </div>

      <AppNotificationsDialog
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />
      <AppAccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </div>
  );
}
