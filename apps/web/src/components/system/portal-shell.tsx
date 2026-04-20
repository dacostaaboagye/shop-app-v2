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
import { AppAccountDialog, AppNotificationsDialog } from "./portal-overlays";
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
    <div className="min-h-svh">
      <NotificationLiveProvider />
      <div className="fixed inset-y-0 left-0 z-20 hidden w-72 lg:block">
        <AppSidebar onAccountOpen={() => setAccountOpen(true)} />
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[18.5rem] max-w-[88vw] bg-sidebar p-0"
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

      <div className="min-h-svh lg:pl-72">
        <AppTopbar
          pathname={pathname}
          onAccountOpen={() => setAccountOpen(true)}
          onMenuOpen={() => setMobileNavOpen(true)}
          onNotificationsOpen={() => setNotificationsOpen(true)}
        />
        <EmailVerificationGate />
        <div className="pb-10">{children}</div>
      </div>

      <AppNotificationsDialog
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />
      <AppAccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </div>
  );
}
