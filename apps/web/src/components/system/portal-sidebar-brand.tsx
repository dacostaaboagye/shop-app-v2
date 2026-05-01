"use client";

import { LayoutGrid } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toRoute } from "@/lib/routes";
import { useBranding } from "./branding-provider";

type PortalSidebarBrandProps = {
  heading: string;
  onNavigate?: (() => void) | undefined;
};

export function PortalSidebarBrand({
  heading,
  onNavigate,
}: PortalSidebarBrandProps) {
  const brandProfile = useBranding();
  const navigateProps = onNavigate ? { onClick: onNavigate } : {};

  return (
    <div className="px-6 py-8">
      <Link
        href={toRoute("/")}
        {...navigateProps}
        scroll={false}
        className="group flex flex-col gap-4"
      >
        <BrandMark
          logoImageUrl={brandProfile.logoImageUrl}
          logoText={brandProfile.logoText}
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="brand-wordmark text-foreground">
              {brandProfile.brandName}
            </span>
            <div className="size-1 rounded-full bg-primary" />
          </div>
          <p className="type-kicker text-muted-foreground/60">{heading}</p>
        </div>
      </Link>
    </div>
  );
}

function BrandMark({
  logoImageUrl,
  logoText,
}: {
  logoImageUrl: string | null;
  logoText: string;
}) {
  return (
    <div className="brand-mark relative size-12 shrink-0 transition-transform group-hover:scale-[1.02] active:scale-[0.98]">
      {logoImageUrl ? (
        <Image
          alt=""
          className="size-full object-cover"
          height={40}
          src={logoImageUrl}
          width={40}
        />
      ) : logoText ? (
        <span className="text-xs font-bold tracking-wide text-sidebar-primary-foreground">
          {logoText.slice(0, 3).toUpperCase()}
        </span>
      ) : (
        <LayoutGrid className="size-4" />
      )}
    </div>
  );
}
