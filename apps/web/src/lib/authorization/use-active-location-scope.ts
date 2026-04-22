"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { toRoute } from "@/lib/routes";
import { useActiveLocationStore } from "@/store/use-active-location-store";
import { resolveOperatingContext } from "./operating-context";

export function useActiveLocationScope(permission: string | null) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, locationScopes } = useAuthorization();
  const activeLocationSlug = useActiveLocationStore(
    (state) => state.selectedLocationSlug,
  );
  const setActiveLocationSlug = useActiveLocationStore(
    (state) => state.setSelectedLocationSlug,
  );
  const searchParamsString = searchParams.toString();
  const urlLocationSlug = useMemo(
    () => searchParams.get("location")?.trim() ?? "",
    [searchParams],
  );
  const operatingContext = useMemo(
    () =>
      resolveOperatingContext({
        activeLocationSlug,
        locationScopes,
        policy: permission
          ? { kind: "location-required", permission }
          : { kind: "global" },
        urlLocationSlug,
      }),
    [activeLocationSlug, locationScopes, permission, urlLocationSlug],
  );
  const accessibleLocationScopes = operatingContext.selectableLocationScopes;
  const selectedLocationScope =
    operatingContext.kind === "location"
      ? operatingContext.locationScope
      : null;
  const selectedLocationSlug = selectedLocationScope?.locationSlug ?? "";

  useEffect(() => {
    if (
      isLoading ||
      accessibleLocationScopes.length === 0 ||
      !selectedLocationScope
    ) {
      return;
    }

    if (activeLocationSlug !== selectedLocationScope.locationSlug) {
      setActiveLocationSlug(selectedLocationScope.locationSlug);
    }

    if (urlLocationSlug === selectedLocationScope.locationSlug) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("location", selectedLocationScope.locationSlug);
    router.replace(toRoute(buildUrl(pathname, nextParams)), { scroll: false });
  }, [
    accessibleLocationScopes.length,
    activeLocationSlug,
    isLoading,
    pathname,
    router,
    searchParamsString,
    selectedLocationScope,
    setActiveLocationSlug,
    urlLocationSlug,
  ]);

  function setSelectedLocationSlug(nextLocationSlug: string) {
    setActiveLocationSlug(nextLocationSlug);

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
