import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const updateScript = join(import.meta.dirname, "update-epic-after-merge.mjs");

describe("update-epic-after-merge", () => {
  it("does not append a duplicate PR link for non-GitHub PR URLs", () => {
    const root = fixtureRoot({
      "E-00C-04-delivery-query-service.md": `---
id: E-00C-04
status: shipped
---
# Delivery Query Service

## Related PRs

- [PR #204](https://example.test/reviews/204) - \`feat(e-00c-04): add delivery query service\`
`,
    });

    try {
      const env = {
        PR_NUMBER: "204",
        PR_TITLE: "feat(e-00c-04): add delivery query service",
        PR_URL: "https://example.test/reviews/204",
      };

      const firstOutput = runUpdate(root, env);
      const secondOutput = runUpdate(root, env);
      const epic = readEpic(root, "E-00C-04-delivery-query-service.md");
      const occurrences =
        epic.match(/https:\/\/example\.test\/reviews\/204/g) ?? [];

      assert.match(firstOutput, /already recorded/);
      assert.match(secondOutput, /already recorded/);
      assert.equal(occurrences.length, 1);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("treats a PR URL prefix as a different link", () => {
    const root = fixtureRoot({
      "E-00C-04-delivery-query-service.md": `---
id: E-00C-04
status: shipped
---
# Delivery Query Service

## Related PRs

- [PR #204](https://example.test/reviews/204) - \`feat(e-00c-04): add delivery query service\`
`,
    });

    try {
      const output = runUpdate(root, {
        PR_NUMBER: "20",
        PR_TITLE: "fix(e-00c-04): patch delivery query service",
        PR_URL: "https://example.test/reviews/20",
      });
      const epic = readEpic(root, "E-00C-04-delivery-query-service.md");

      assert.match(
        output,
        /updated docs\/backlog\/epics\/E-00C-04-delivery-query-service\.md/,
      );
      assert.match(
        epic,
        /- \[PR #20\]\(https:\/\/example\.test\/reviews\/20\) - `fix\(e-00c-04\): patch delivery query service`/,
      );
      assert.match(
        epic,
        /- \[PR #204\]\(https:\/\/example\.test\/reviews\/204\) - `feat\(e-00c-04\): add delivery query service`/,
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("appends a PR link when the epic has not recorded the URL yet", () => {
    const root = fixtureRoot({
      "E-00C-05-delivery-rest-api.md": `---
id: E-00C-05
status: reviewed
---
# Delivery REST API
`,
    });

    try {
      const output = runUpdate(root, {
        PR_NUMBER: "205",
        PR_TITLE: "feat(e-00c-05): add delivery rest api",
        PR_URL: "https://example.test/reviews/205",
      });
      const epic = readEpic(root, "E-00C-05-delivery-rest-api.md");

      assert.match(
        output,
        /updated docs\/backlog\/epics\/E-00C-05-delivery-rest-api\.md/,
      );
      assert.match(epic, /## Related PRs/);
      assert.match(
        epic,
        /- \[PR #205\]\(https:\/\/example\.test\/reviews\/205\) - `feat\(e-00c-05\): add delivery rest api`/,
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

function fixtureRoot(files) {
  const root = mkdtempSync(join(tmpdir(), "update-epic-"));
  const epicsDir = join(root, "docs", "backlog", "epics");
  mkdirSync(epicsDir, { recursive: true });

  for (const [name, source] of Object.entries(files)) {
    writeFileSync(join(epicsDir, name), source);
  }

  return root;
}

function readEpic(root, name) {
  return readFileSync(join(root, "docs", "backlog", "epics", name), "utf8");
}

function runUpdate(root, env) {
  return execFileSync(process.execPath, [updateScript], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: "pipe",
  });
}
