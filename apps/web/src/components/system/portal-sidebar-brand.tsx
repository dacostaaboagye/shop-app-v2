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
    <div className="px-6 py-8">
      <Link
        href={toRoute("/")}
        {...navigateProps}
        scroll={false}
        className="group flex flex-col gap-4"
      >
        <BrandMark
          accentColor={brandProfile.accentColor}
          logoImageUrl={brandProfile.logoImageUrl}
          logoText={brandProfile.logoText}
          primaryColor={brandProfile.primaryColor}
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-heading text-xl font-bold tracking-tight text-foreground">
              {brandProfile.brandName}
            </span>
            <div className="size-1 rounded-full bg-primary" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
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
      className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:scale-105 active:scale-95"
      style={{
        backgroundColor: primaryColor,
        borderBottom: `4px solid ${accentColor}`,
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
