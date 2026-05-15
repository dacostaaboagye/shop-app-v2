import { isIP } from "node:net";

export type ResolvedAddress = {
  address: string;
  family: number;
};

export type SafeLogoFetchTarget = {
  address: string;
  family: 4 | 6;
  hostname: string;
  url: URL;
};

export async function resolveSafeLogoFetchTarget(
  value: string,
  lookupHost: (hostname: string) => Promise<readonly ResolvedAddress[]>,
): Promise<SafeLogoFetchTarget | null> {
  const url = parseHttpUrl(value);
  if (!url) return null;

  const hostname = normalizeHostname(url.hostname);
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return null;
  }

  const literalIpVersion = isIP(hostname);
  if (literalIpVersion === 4 || literalIpVersion === 6) {
    return isPrivateOrReservedIpAddress(hostname)
      ? null
      : { address: hostname, family: literalIpVersion, hostname, url };
  }

  try {
    const addresses = await lookupHost(hostname);
    if (
      addresses.length === 0 ||
      addresses.some((entry) => isPrivateOrReservedIpAddress(entry.address))
    ) {
      return null;
    }

    const [selected] = addresses;
    if (!selected || (selected.family !== 4 && selected.family !== 6)) {
      return null;
    }

    return {
      address: selected.address,
      family: selected.family,
      hostname,
      url,
    };
  } catch {
    return null;
  }
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function normalizeHostname(hostname: string): string {
  const lower = hostname.toLowerCase();
  if (lower.startsWith("[") && lower.endsWith("]")) return lower.slice(1, -1);
  return lower;
}

function isPrivateOrReservedIpAddress(address: string): boolean {
  const normalized = normalizeHostname(address);
  if (isIP(normalized) === 4) return isPrivateOrReservedIpv4(normalized);
  if (isIP(normalized) === 6) return isPrivateOrReservedIpv6(normalized);
  return true;
}

function isPrivateOrReservedIpv4(address: string): boolean {
  const octets = address.split(".").map((part) => Number(part));
  const [a, b] = octets;

  if (
    octets.length !== 4 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255) ||
    a === undefined ||
    b === undefined
  ) {
    return true;
  }

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 31) ||
    (a === 192 && b === 52) ||
    (a === 192 && b === 88) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 175) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isPrivateOrReservedIpv6(address: string): boolean {
  const hextets = toIpv6Hextets(address);
  if (!hextets) return true;
  if (hextets.length !== 8) return true;

  const [a, b, c, d, e, f] = hextets as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  if (hextets.every((part) => part === 0)) return true;
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0) {
    return true;
  }
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0xffff) {
    return true;
  }
  if (a === 0x64 && b === 0xff9b && c === 0 && d === 0 && e === 0 && f === 0) {
    return true;
  }
  if (a === 0x64 && b === 0xff9b && c === 1) return true;
  if (a === 0x100 && b === 0 && c === 0 && d === 0) return true;
  if (a === 0x100 && b === 0 && c === 0 && d === 1) return true;
  if (a >= 0xfc00 && a <= 0xfdff) return true;
  if (a >= 0xfe80 && a <= 0xfebf) return true;
  if (a >= 0xfec0 && a <= 0xfeff) return true;
  if (a >= 0xff00) return true;
  if (a === 0x2001 && (b <= 0x1ff || b === 0xdb8)) return true;
  if (a === 0x2002) return true;
  if (a === 0x2620 && b === 0x4f && c === 0x8000) return true;
  if (a >= 0x3ff0 && a <= 0x3fff) return true;
  if (a === 0x5f00) return true;
  return false;
}

function toIpv6Hextets(address: string): number[] | null {
  const sections = address.split("::");
  if (sections.length > 2) return null;

  const head = parseIpv6Section(sections[0] ?? "");
  const tail = parseIpv6Section(sections[1] ?? "");
  if (!head || !tail) return null;

  const missingCount = 8 - head.length - tail.length;
  if (sections.length === 1 && missingCount !== 0) return null;
  if (sections.length === 2 && missingCount < 1) return null;

  return [...head, ...Array<number>(missingCount).fill(0), ...tail];
}

function parseIpv6Section(section: string): number[] | null {
  if (!section) return [];

  const parts = section.split(":");
  const hextets: number[] = [];
  for (const [index, part] of parts.entries()) {
    if (part.includes(".")) {
      if (index !== parts.length - 1) return null;
      const embedded = parseEmbeddedIpv4(part);
      if (!embedded) return null;
      hextets.push(...embedded);
      continue;
    }

    if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
    hextets.push(Number.parseInt(part, 16));
  }

  return hextets;
}

function parseEmbeddedIpv4(value: string): [number, number] | null {
  const octets = value.split(".").map((part) => Number(part));
  if (
    octets.length !== 4 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }

  const [a, b, c, d] = octets as [number, number, number, number];
  return [(a << 8) + b, (c << 8) + d];
}
