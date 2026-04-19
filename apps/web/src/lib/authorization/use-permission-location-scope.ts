"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { toRoute } from "@/lib/routes";
import {
  getPermissionLocationScopes,
  resolveSelectedLocationScope,
} from "./location-scopes";

export function usePermissionLocationScope(permission: string) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, locationScopes } = useAuthorization();
  const searchParamsString = searchParams.toString();
  const accessibleLocationScopes = useMemo(
    () => getPermissionLocationScopes(locationScopes, permission),
    [locationScopes, permission],
  );
  const selectedLocationSlug = useMemo(
    () => searchParams.get("location")?.trim() ?? "",
    [searchParams],
  );
  const selectedLocationScope = useMemo(
    () =>
      resolveSelectedLocationScope(
        accessibleLocationScopes,
        selectedLocationSlug || null,
      ),
    [accessibleLocationScopes, selectedLocationSlug],
  );

  useEffect(() => {
    if (
      isLoading ||
      accessibleLocationScopes.length === 0 ||
      !selectedLocationScope ||
      selectedLocationSlug === selectedLocationScope.locationSlug
    ) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("location", selectedLocationScope.locationSlug);
    router.replace(toRoute(buildUrl(pathname, nextParams)), { scroll: false });
  }, [
    accessibleLocationScopes.length,
    isLoading,
    pathname,
    router,
    searchParamsString,
    selectedLocationScope,
    selectedLocationSlug,
  ]);

  function setSelectedLocationSlug(nextLocationSlug: string) {
    const nextParams = new URLSearchParams(searchParamsString);

    if (nextLocationSlug) {
      nextParams.set("location", nextLocationSlug);
    } else {
      nextParams.delete("location");
    }

    router.replace(toRoute(buildUrl(pathname, nextParams)), {
      scroll: false,
    });
  }

  return {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  };
}

function buildUrl(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
