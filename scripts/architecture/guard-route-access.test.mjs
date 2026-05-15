import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const guardScript = join(import.meta.dirname, "guard-route-access.mjs");

describe("route access guard", () => {
  it("passes route registrations with explicit access metadata", () => {
    const root = fixtureRoot({
      "safe.routes.ts": `
        export function register(app) {
          app.route({
            method: "GET",
            url: "/safe",
            config: { access: { kind: "authenticated" } },
            handler() {}
          });
          app.get("/also-safe", { config: { access: safeRoute.access } }, async () => {});
        }
      `,
    });

    assert.doesNotThrow(() => runGuard(root));
  });

  it("fails when any route registration lacks access metadata", () => {
    const root = fixtureRoot({
      "mixed.routes.ts": `
        export function register(fastify) {
          fastify.route({
            method: "GET",
            url: "/safe",
            config: { access: { kind: "authenticated" } },
            handler() {}
          });
          fastify.post("/unsafe", async () => {});
        }
      `,
    });

    assert.throws(
      () => runGuard(root),
      /Missing access metadata.*mixed\.routes\.ts/,
    );
  });

  it("ignores comments and strings that mention access metadata", () => {
    const root = fixtureRoot({
      "comment-only.routes.ts": `
        // config: { access: pretendRoute.access }
        export function register(scope) {
          scope.route({
            method: "GET",
            url: "/unsafe-access-string",
            handler() {
              return "config: { access: fake }";
            }
          });
        }
      `,
    });

    assert.throws(
      () => runGuard(root),
      /Missing access metadata.*comment-only\.routes\.ts/,
    );
  });

  it("ignores non-route helper calls that share Fastify shortcut names", () => {
    const root = fixtureRoot({
      "helpers.routes.ts": `
        export function register(app, snapshots, mediaService) {
          app.get("/safe", { config: { access: safeRoute.access } }, async () => {
            await mediaService.delete("image-id");
            return snapshots.get("sku-1");
          });
        }
      `,
    });

    assert.doesNotThrow(() => runGuard(root));
  });
});

function fixtureRoot(files) {
  const root = mkdtempSync(join(tmpdir(), "route-access-"));
  const moduleRoot = join(root, "modules");
  mkdirSync(moduleRoot, { recursive: true });

  for (const [name, source] of Object.entries(files)) {
    writeFileSync(join(moduleRoot, name), source);
  }

  return moduleRoot;
}

function runGuard(root) {
  try {
    return execFileSync(process.execPath, [guardScript], {
      env: { ...process.env, ROUTE_ACCESS_GUARD_ROOT: root },
      encoding: "utf8",
      stdio: "pipe",
    });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}
