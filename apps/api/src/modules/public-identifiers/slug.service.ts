import { AppError } from "../_core/errors/app-error.js";

export const slugEntityTypes = ["location", "role", "user"] as const;

export type SlugEntityType = (typeof slugEntityTypes)[number];

export type SlugLookupResult =
  | { status: "active"; entityUuid: string }
  | { status: "missing" }
  | { status: "redirect"; entityUuid: string; newSlug: string };

export type SlugRedirectRecord = {
  entityType: SlugEntityType;
  entityUuid: string;
  newSlug: string;
  oldSlug: string;
};

export type ResolvedSlug =
  | {
      entityUuid: string;
      requestedSlug: string;
      slug: string;
      status: "active";
    }
  | {
      entityUuid: string;
      redirectChain: string[];
      requestedSlug: string;
      slug: string;
      status: "redirected";
    }
  | {
      requestedSlug: string;
      status: "missing";
    };

export interface SlugRepository {
  lookupSlug(input: {
    entityType: SlugEntityType;
    slug: string;
  }): Promise<SlugLookupResult>;
  recordRedirect(input: SlugRedirectRecord): Promise<void>;
}

export interface SlugAllocator {
  allocateSlug(input: {
    entityType: SlugEntityType;
    value: string;
  }): Promise<string>;
}

export class SlugService implements SlugAllocator {
  constructor(
    private readonly repository: SlugRepository,
    private readonly maxAllocationAttempts = 100,
    private readonly maxRedirectDepth = 10,
  ) {}

  async allocateSlug(input: {
    entityType: SlugEntityType;
    value: string;
  }): Promise<string> {
    const baseSlug = normalizeSlug(input.value);

    for (let attempt = 0; attempt < this.maxAllocationAttempts; attempt += 1) {
      const candidate = buildCandidateSlug(baseSlug, attempt);
      const lookup = await this.repository.lookupSlug({
        entityType: input.entityType,
        slug: candidate,
      });

      if (lookup.status === "missing") {
        return candidate;
      }
    }

    throw slugAllocationError();
  }

  async planSlugChange(input: {
    currentSlug: string;
    entityType: SlugEntityType;
    entityUuid: string;
    value: string;
  }): Promise<{
    redirect: SlugRedirectRecord | null;
    slug: string;
  }> {
    const currentSlug = normalizeSlug(input.currentSlug);
    const baseSlug = normalizeSlug(input.value);

    for (let attempt = 0; attempt < this.maxAllocationAttempts; attempt += 1) {
      const candidate = buildCandidateSlug(baseSlug, attempt);

      if (candidate === currentSlug) {
        return { redirect: null, slug: currentSlug };
      }

      const lookup = await this.repository.lookupSlug({
        entityType: input.entityType,
        slug: candidate,
      });

      if (lookup.status !== "missing") {
        continue;
      }

      return {
        redirect: {
          entityType: input.entityType,
          entityUuid: input.entityUuid,
          newSlug: candidate,
          oldSlug: currentSlug,
        },
        slug: candidate,
      };
    }

    throw slugAllocationError();
  }

  async recordRedirect(input: SlugRedirectRecord): Promise<void> {
    const oldSlug = normalizeSlug(input.oldSlug);
    const newSlug = normalizeSlug(input.newSlug);

    if (oldSlug === newSlug) {
      return;
    }

    await this.repository.recordRedirect({
      ...input,
      newSlug,
      oldSlug,
    });
  }

  async resolveSlug(input: {
    entityType: SlugEntityType;
    slug: string;
  }): Promise<ResolvedSlug> {
    const requestedSlug = normalizeSlug(input.slug);
    const firstLookup = await this.repository.lookupSlug({
      entityType: input.entityType,
      slug: requestedSlug,
    });

    if (firstLookup.status === "active") {
      return {
        entityUuid: firstLookup.entityUuid,
        requestedSlug,
        slug: requestedSlug,
        status: "active",
      };
    }

    if (firstLookup.status === "missing") {
      return { requestedSlug, status: "missing" };
    }

    const redirectChain = [requestedSlug];
    let currentLookup: SlugLookupResult = firstLookup;
    let currentSlug = requestedSlug;

    for (let depth = 0; depth < this.maxRedirectDepth; depth += 1) {
      if (currentLookup.status === "missing") {
        return { requestedSlug, status: "missing" };
      }

      if (currentLookup.status === "active") {
        return {
          entityUuid: currentLookup.entityUuid,
          redirectChain,
          requestedSlug,
          slug: currentSlug,
          status: "redirected",
        };
      }

      currentSlug = currentLookup.newSlug;

      if (redirectChain.includes(currentSlug)) {
        throw slugRedirectCycleError();
      }

      redirectChain.push(currentSlug);
      currentLookup = await this.repository.lookupSlug({
        entityType: input.entityType,
        slug: currentSlug,
      });
    }

    throw slugRedirectCycleError();
  }
}

function buildCandidateSlug(baseSlug: string, attempt: number): string {
  if (attempt === 0) {
    return truncateSlug(baseSlug, 120);
  }

  const suffix = `-${attempt + 1}`;
  return `${truncateSlug(baseSlug, 120 - suffix.length)}${suffix}`;
}

function normalizeSlug(value: string): string {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (!normalizedValue) {
    return "item";
  }

  return truncateSlug(normalizedValue, 120);
}

function truncateSlug(value: string, maxLength: number): string {
  const truncatedValue = value.slice(0, maxLength).replace(/-+$/g, "");

  return truncatedValue || "item";
}

function slugAllocationError(): AppError {
  return new AppError({
    code: "conflict",
    detail: "Unable to allocate a unique slug. Try again.",
    statusCode: 409,
    title: "Slug allocation failed",
  });
}

function slugRedirectCycleError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Slug redirect history is invalid.",
    statusCode: 500,
    title: "Slug redirect error",
  });
}
