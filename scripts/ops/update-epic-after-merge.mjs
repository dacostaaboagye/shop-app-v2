#!/usr/bin/env node
import {
  appendFileSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const epicsDir = join(process.cwd(), "docs", "backlog", "epics");

const prNumber = process.env.PR_NUMBER;
const prTitle = process.env.PR_TITLE;
const prUrl = process.env.PR_URL;

if (!prNumber || !prTitle || !prUrl) {
  console.error("missing required env: PR_NUMBER, PR_TITLE, PR_URL");
  process.exit(2);
}

const conventionalCommit =
  /^(?:feat|fix|chore|refactor|test|docs|perf|build|ci|style|revert)\(([a-z0-9-]+)\):/i;
const titleMatch = prTitle.match(conventionalCommit);
const scope = titleMatch?.[1]?.toLowerCase();

if (!scope) {
  console.log(
    `no conventional-commit scope in PR title: "${prTitle}" — skipping`,
  );
  process.exit(0);
}

if (scope === "ops") {
  console.log("ops-scoped PR — no epic file to update");
  process.exit(0);
}

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return null;
  const fm = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const kv = rawLine.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

const epicFiles = readdirSync(epicsDir)
  .filter((name) => name.endsWith(".md"))
  .map((name) => {
    const path = join(epicsDir, name);
    const content = readFileSync(path, "utf8");
    return { name, path, content, frontmatter: parseFrontmatter(content) };
  })
  .filter((entry) => entry.frontmatter);

const matched = epicFiles.find(
  (entry) => entry.frontmatter.id?.toLowerCase() === scope,
);

if (!matched) {
  console.log(
    `no epic file with id matching scope "${scope}" — likely a sub-slice rolled into a parent epic. skipping.`,
  );
  process.exit(0);
}

let updated = matched.content;

const prLink = `- [PR #${prNumber}](${prUrl}) - \`${prTitle}\``;
const existingPrUrlLink = `](${prUrl})`;

if (updated.includes(existingPrUrlLink)) {
  console.log(`PR ${prUrl} already recorded — no change`);
  process.exit(0);
}

const sectionRegex = /(\r?\n)## Related PRs\r?\n[\s\S]*?(?=\r?\n## |\s*$)/;
const sectionMatch = updated.match(sectionRegex);

if (sectionMatch) {
  const trimmed = sectionMatch[0].replace(/\s+$/, "");
  updated = updated.replace(sectionMatch[0], `${trimmed}\n${prLink}\n`);
} else {
  const trailing = updated.endsWith("\n") ? "" : "\n";
  updated = `${updated}${trailing}\n## Related PRs\n\n${prLink}\n`;
}

if (updated === matched.content) {
  console.log("no changes needed");
  process.exit(0);
}

writeFileSync(matched.path, updated, "utf8");
const changedFile = `docs/backlog/epics/${matched.name}`;
console.log(`updated ${changedFile}`);

const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  appendFileSync(outputFile, `changed_file=${changedFile}\n`);
}
