"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { useInterfacePreferencesStore } from "@/store/use-interface-preferences-store";
import {
  getActiveItem,
  getShellConfig,
  getVisibleNavSections,
  isPortalItemActive,
} from "./portal-shell-config";
import { PortalSidebarBrand } from "./portal-sidebar-brand";

type AppSidebarProps = {
  onAccountOpen: () => void;
  onNavigate?: () => void;
};
const SIDEBAR_SKELETON_KEYS = [
  "sidebar-loading-1",
  "sidebar-loading-2",
  "sidebar-loading-3",
  "sidebar-loading-4",
] as const;

export function AppSidebar({ onAccountOpen, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const user = useAuthSessionStore((state) => state.user);
  const { ability, isLoading } = useAuthorization();
  const { sidebarExpandedSections, setSidebarExpandedSections } =
    useInterfacePreferencesStore();

  const config = getShellConfig();
  const navSections = getVisibleNavSections(ability);
  const navigateProps = onNavigate ? { onClick: onNavigate } : {};

  const activeLinkRef = React.useRef<HTMLAnchorElement>(null);

  const activeItem = React.useMemo(() => getActiveItem(pathname), [pathname]);

  // Default to expanding sections that contain the active item
  const activeSectionTitles = React.useMemo(() => {
    return navSections
      .filter((section) =>
        section.items.some((item) => isPortalItemActive(item, pathname)),
      )
      .map((section) => section.title);
  }, [navSections, pathname]);

  // Sync expanded sections: ensure active sections are always included
  React.useEffect(() => {
    if (activeSectionTitles.length > 0) {
      const currentExpanded = sidebarExpandedSections ?? [];
      const missingTitles = activeSectionTitles.filter(
        (title) => !currentExpanded.includes(title),
      );

      if (missingTitles.length > 0) {
        setSidebarExpandedSections([...currentExpanded, ...missingTitles]);
      }
    }
  }, [
    activeSectionTitles,
    sidebarExpandedSections,
    setSidebarExpandedSections,
  ]);

  const expandedValue = sidebarExpandedSections ?? activeSectionTitles;

  // Auto-scroll active item into view
  React.useEffect(() => {
    if (activeLinkRef.current) {
      activeLinkRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  });

  return (
    <aside className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <PortalSidebarBrand heading={config.heading} onNavigate={onNavigate} />

      <div className="px-8">
        <div className="h-px w-full bg-sidebar-border/60" />
      </div>

      <nav
        className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none"
        aria-label="Main navigation"
      >
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {SIDEBAR_SKELETON_KEYS.map((key) => (
              <div key={key} className="h-10 rounded-xl bg-sidebar-accent/50" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <Accordion
              multiple
              value={expandedValue}
              onValueChange={setSidebarExpandedSections}
              className="flex flex-col gap-8"
            >
              {navSections.map((section) => {
                const sectionActive = section.items.some((item) =>
                  isPortalItemActive(item, pathname),
                );

                return (
                  <AccordionItem
                    key={section.title}
                    value={section.title}
                    className="border-none"
                  >
                    <AccordionTrigger
                      className={cn(
                        "group/trigger relative rounded-xl px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-sidebar-accent/50 hover:no-underline",
                        sectionActive
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/40 hover:text-sidebar-foreground data-open:text-sidebar-foreground/80",
                      )}
                    >
                      {section.title}
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <div className="mt-2 flex flex-col gap-1">
                        {section.items.map((item) => {
                          const active = activeItem?.href === item.href;
                          const Icon = item.icon;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              ref={active ? activeLinkRef : undefined}
                              {...navigateProps}
                              scroll={false}
                              className={cn(
                                "group/link flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                                active
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "size-4 shrink-0 transition-transform duration-300 group-hover/link:scale-110",
                                  active
                                    ? "text-sidebar-primary-foreground"
                                    : "text-sidebar-foreground/40 group-hover/link:text-sidebar-foreground",
                                )}
                              />
                              <span className="text-sm font-semibold tracking-tight">
                                {item.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}
      </nav>

      <div className="p-4">
        <button
          type="button"
          onClick={onAccountOpen}
          className="group flex w-full items-center gap-3 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 p-2 text-left transition-all hover:bg-sidebar-accent active:scale-[0.98]"
        >
          <div className="relative">
            <Avatar
              size="lg"
              className="rounded-lg ring-2 ring-transparent transition-all group-hover:ring-sidebar-primary/20"
            >
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-bold">
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-sidebar bg-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-sidebar-foreground">
              {user ? `${user.firstName} ${user.lastName}` : "Account"}
            </p>
            <p className="truncate text-[10px] font-medium text-sidebar-foreground/40">
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
