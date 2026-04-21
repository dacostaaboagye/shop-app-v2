"use client";

import { useQuery } from "@tanstack/react-query";
import { LayoutGrid } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import { toRoute } from "@/lib/routes";

type PortalSidebarBrandProps = {
  heading: string;
  onNavigate?: (() => void) | undefined;
};

export function PortalSidebarBrand({
  heading,
  onNavigate,
}: PortalSidebarBrandProps) {
  const brandQuery = useQuery({
    queryFn: () => fetchOfficialDocumentProfile(),
    queryKey: officialDocumentProfileQueryKey(),
    staleTime: 5 * 60_000,
  });
  const brandProfile = brandQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;
  const navigateProps = onNavigate ? { onClick: onNavigate } : {};

  return (
    <div className="border-b border-sidebar-border px-4 py-4">
      <Link
        href={toRoute("/")}
        {...navigateProps}
        scroll={false}
        className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent"
      >
        <BrandMark
          accentColor={brandProfile.accentColor}
          logoImageUrl={brandProfile.logoImageUrl}
          logoText={brandProfile.logoText}
          primaryColor={brandProfile.primaryColor}
        />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-sidebar-foreground/60">
            {brandProfile.logoText}
          </p>
          <p className="truncate text-sm font-semibold">
            {brandProfile.brandName}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            {heading}
          </p>
        </div>
      </Link>
    </div>
  );
}

function BrandMark({
  accentColor,
  logoImageUrl,
  logoText,
  primaryColor,
}: {
  accentColor: string;
  logoImageUrl: string | null;
  logoText: string;
  primaryColor: string;
}) {
  return (
    <div
      aria-hidden
      className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
      style={{
        backgroundColor: primaryColor,
        boxShadow: `inset 0 -3px 0 ${accentColor}`,
      }}
    >
      {logoImageUrl ? (
        <Image
          alt=""
          className="size-full object-cover"
          height={40}
          src={logoImageUrl}
          unoptimized
          width={40}
        />
      ) : logoText ? (
        <span className="text-xs font-bold tracking-wide">
          {logoText.slice(0, 3).toUpperCase()}
        </span>
      ) : (
        <LayoutGrid className="size-4" />
      )}
    </div>
  );
}
