import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { bytesMatchClaimedMime } from "../_core/file-magic.js";
import {
  type ResolvedAddress,
  resolveSafeLogoFetchTarget,
  type SafeLogoFetchTarget,
} from "./official-document-logo-network-policy.js";

const LOGO_IMAGE_MAX_BYTES = 2_000_000;
const LOGO_IMAGE_TIMEOUT_MS = 5_000;
const SUPPORTED_LOGO_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);
const logoImageCache = new Map<string, Promise<Buffer | null>>();

type LogoFetchDependencies = {
  lookupHost?: (hostname: string) => Promise<readonly ResolvedAddress[]>;
  requestImage?: (target: SafeLogoFetchTarget) => Promise<Buffer | null>;
};

export async function getOfficialDocumentLogoImage(
  url: string | null,
): Promise<Buffer | null> {
  if (!url) return null;

  const cached = logoImageCache.get(url);
  if (cached) return cached;

  const pending = fetchOfficialDocumentLogoImage(url);
  logoImageCache.set(url, pending);
  return pending;
}

export async function fetchOfficialDocumentLogoImage(
  value: string,
  dependencies: LogoFetchDependencies = {},
): Promise<Buffer | null> {
  const target = await resolveSafeLogoFetchTarget(
    value,
    dependencies.lookupHost ?? defaultLookupHost,
  );

  if (!target) return null;

  return (dependencies.requestImage ?? requestOfficialDocumentLogoImage)(
    target,
  );
}

export async function isSafeLogoImageUrlForFetch(
  value: string,
): Promise<boolean> {
  const target = await resolveSafeLogoFetchTarget(value, defaultLookupHost);
  return target !== null;
}

export async function requestOfficialDocumentLogoImage(
  target: SafeLogoFetchTarget,
): Promise<Buffer | null> {
  return new Promise((resolve) => {
    let settled = false;
    let deadline: NodeJS.Timeout | undefined;
    const finish = (result: Buffer | null) => {
      if (settled) return;
      settled = true;
      if (deadline) clearTimeout(deadline);
      resolve(result);
    };
    const request = (
      target.url.protocol === "https:" ? httpsRequest : httpRequest
    )(
      {
        headers: { Accept: "image/*", Host: target.url.host },
        family: target.family,
        hostname: target.address,
        method: "GET",
        path: `${target.url.pathname}${target.url.search}`,
        port: target.url.port ? Number(target.url.port) : undefined,
        protocol: target.url.protocol,
        servername: isIP(target.hostname) === 0 ? target.hostname : undefined,
        timeout: LOGO_IMAGE_TIMEOUT_MS,
      },
      (response) => {
        const statusCode = response.statusCode ?? 0;
        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          finish(null);
          return;
        }

        const mimeType = normalizeImageMimeType(
          response.headers["content-type"],
        );
        if (!mimeType) {
          response.resume();
          finish(null);
          return;
        }

        const contentLength = Number(response.headers["content-length"] ?? 0);
        if (contentLength > LOGO_IMAGE_MAX_BYTES) {
          response.resume();
          finish(null);
          return;
        }

        const chunks: Buffer[] = [];
        let receivedBytes = 0;
        response.on("data", (chunk: Buffer) => {
          receivedBytes += chunk.length;
          if (receivedBytes > LOGO_IMAGE_MAX_BYTES) {
            request.destroy();
            finish(null);
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          const image = Buffer.concat(chunks);
          finish(bytesMatchClaimedMime(mimeType, image) ? image : null);
        });
      },
    );

    request.on("error", () => finish(null));
    request.on("timeout", () => {
      request.destroy();
      finish(null);
    });
    deadline = setTimeout(() => {
      request.destroy();
      finish(null);
    }, LOGO_IMAGE_TIMEOUT_MS);
    request.end();
  });
}

async function defaultLookupHost(hostname: string) {
  return lookup(hostname, { all: true, verbatim: true });
}

function normalizeImageMimeType(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const [mimeType] = value.toLowerCase().split(";");
  const normalized = mimeType?.trim() ?? "";
  return SUPPORTED_LOGO_IMAGE_MIME_TYPES.has(normalized) ? normalized : null;
}
