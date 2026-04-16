"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  fetchCurrentUserPermissions,
  getCurrentUserPermissionsQueryKey,
} from "@/lib/react-query/auth";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { AppAccountDialog, AppNotificationsDialog } from "./portal-overlays";
import { AppSidebar } from "./portal-sidebar";
import { AppTopbar } from "./portal-topbar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const user = useAuthSessionStore((state) => state.user);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const permissionsQuery = useQuery({
    queryFn: fetchCurrentUserPermissions,
    queryKey: getCurrentUserPermissionsQueryKey(user?.slug ?? null),
  });
  const permissions = permissionsQuery.data?.permissions ?? [];

  useEffect(() => {
    if (pathname) {
      setMobileNavOpen(false);
    }
  }, [pathname]);

  return (
    <div className="min-h-svh">
      <div className="fixed inset-y-0 left-0 z-20 hidden w-72 lg:block">
        <AppSidebar
          permissions={permissions}
          isLoadingPermissions={permissionsQuery.isLoading}
          onAccountOpen={() => setAccountOpen(true)}
        />
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
            permissions={permissions}
            isLoadingPermissions={permissionsQuery.isLoading}
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
