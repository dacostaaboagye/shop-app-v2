"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import {
  getShellConfig,
  getVisibleNavSections,
  isPortalItemActive,
} from "./portal-shell-config";

type AppSidebarProps = {
  isLoadingPermissions?: boolean;
  onAccountOpen: () => void;
  onNavigate?: () => void;
  permissions?: readonly string[];
};
const SIDEBAR_SKELETON_KEYS = [
  "sidebar-loading-1",
  "sidebar-loading-2",
  "sidebar-loading-3",
  "sidebar-loading-4",
] as const;

export function AppSidebar({
  isLoadingPermissions = false,
  onAccountOpen,
  onNavigate,
  permissions = [],
}: AppSidebarProps) {
  const pathname = usePathname();
  const user = useAuthSessionStore((state) => state.user);
  const config = getShellConfig();
  const navSections = getVisibleNavSections(permissions);
  const navigateProps = onNavigate ? { onClick: onNavigate } : {};

  return (
    <aside className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Link
          href={toRoute("/")}
          {...navigateProps}
          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <LayoutGrid className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.16em] text-sidebar-foreground/60">
              Shop
            </p>
            <p className="truncate text-sm font-semibold">{config.heading}</p>
          </div>
        </Link>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Main navigation"
      >
        {isLoadingPermissions ? (
          <div className="flex flex-col gap-3 px-3">
            {SIDEBAR_SKELETON_KEYS.map((key) => (
              <div
                key={key}
                className="h-9 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/45"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {navSections.map((section) => (
              <section key={section.title}>
                <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/52">
                  {section.title}
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {section.items.map((item) => {
                    const active = isPortalItemActive(item, pathname);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        {...navigateProps}
                        className={cn(
                          "rounded-lg border border-transparent px-3 py-2 transition-colors",
                          active
                            ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/72 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-md",
                              active
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "bg-sidebar-accent text-sidebar-foreground/70",
                            )}
                          >
                            <Icon className="size-3.5" />
                          </div>
                          <p className="text-sm font-medium">{item.label}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
            {navSections.length === 0 ? (
              <div className="rounded-lg border border-sidebar-border/80 bg-sidebar-accent/45 px-3 py-4 text-sm text-sidebar-foreground/68">
                No pages are visible for the current permission set yet.
              </div>
            ) : null}
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={onAccountOpen}
          className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border/80 bg-sidebar-accent/60 px-3 py-3 text-left transition-colors hover:bg-sidebar-accent"
        >
          <Avatar size="lg">
            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user ? `${user.firstName} ${user.lastName}` : "Account"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/65">
              {user?.email ?? "Signed-out session"}
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
}

function getUserInitials(
  user: ReturnType<typeof useAuthSessionStore.getState>["user"],
) {
  if (!user) {
    return "NA";
  }

  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}
