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
          className="w-[18.5rem] max-w-[88vw] bg-sidebar p-0 border-r-0 shadow-panel"
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
        {/* Clean, Non-Theatrical Header Background */}
        <div className="absolute inset-x-0 top-0 h-64 lg:pl-72 border-b border-border/40 bg-background" />

        <AppTopbar
          pathname={pathname}
          onAccountOpen={() => setAccountOpen(true)}
          onMenuOpen={() => setMobileNavOpen(true)}
          onNotificationsOpen={() => setNotificationsOpen(true)}
        />

        <main className="relative z-10 px-6 sm:px-10 lg:px-12">
          <EmailVerificationGate />
          <div className="mx-auto max-w-screen-2xl pb-20">{children}</div>
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
