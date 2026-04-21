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

      <nav
        className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-sidebar-border"
        aria-label="Main navigation"
      >
        {isLoading ? (
          <div className="flex flex-col gap-3 px-3">
            {SIDEBAR_SKELETON_KEYS.map((key) => (
              <div
                key={key}
                className="h-9 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/45"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Accordion
              multiple
              value={expandedValue}
              onValueChange={setSidebarExpandedSections}
              className="flex flex-col gap-2"
            >
              {navSections.map((section) => {
                const sectionActive = section.items.some((item) =>
                  isPortalItemActive(item, pathname),
                );

                return (
                  <AccordionItem key={section.title} value={section.title}>
                    <AccordionTrigger
                      className={cn(
                        "group/trigger relative rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all hover:bg-sidebar-accent/40 hover:no-underline",
                        sectionActive
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/75 hover:text-sidebar-foreground data-open:text-sidebar-foreground",
                      )}
                    >
                      {section.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mt-1 flex flex-col gap-0.5 pt-1 pl-2">
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
                                "group/link relative flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-all duration-200",
                                active
                                  ? "bg-sidebar-accent/60 text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border/30"
                                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground",
                              )}
                            >
                              {active && (
                                <div className="absolute top-1/2 -left-1.5 h-6 w-1 -translate-y-1/2 rounded-full bg-sidebar-primary shadow-[0_0_10px_rgba(var(--sidebar-primary-rgb),0.5)]" />
                              )}
                              <div
                                className={cn(
                                  "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                                  active
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                                    : "bg-sidebar-accent/70 text-sidebar-foreground/60 group-hover/link:bg-sidebar-accent group-hover/link:text-sidebar-foreground",
                                )}
                              >
                                <Icon className="size-3.5" />
                              </div>
                              <p className="text-sm font-medium tracking-wide">
                                {item.label}
                              </p>
                            </Link>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
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
