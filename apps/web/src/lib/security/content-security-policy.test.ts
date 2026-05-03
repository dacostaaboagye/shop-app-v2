import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const nextConfigPath = resolve(currentDir, "../../../next.config.mjs");

describe("web Content-Security-Policy", () => {
  it("scopes direct R2 uploads to the configured account and allows local PDF preview frames", async () => {
    const config = await readFile(nextConfigPath, "utf8");

    assert.match(config, /r2AccountIdFromEnv/);
    assert.match(
      config,
      /https:\/\/\*.\$\{r2AccountIdFromEnv\}\.r2\.cloudflarestorage\.com/,
    );
    assert.doesNotMatch(config, /https:\/\/\*\.r2\.cloudflarestorage\.com/);
    assert.match(config, /"frame-src 'self' blob:"/);
  });
});
