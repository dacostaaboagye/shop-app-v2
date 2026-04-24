import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function resolveGitDir() {
  const dotGitPath = resolve(process.cwd(), ".git");
  const stats = statSync(dotGitPath);

  if (stats.isDirectory()) {
    return dotGitPath;
  }

  const pointer = readFileSync(dotGitPath, "utf8").trim();
  const gitDir = pointer.replace(/^gitdir:\s*/i, "");
  return resolve(dirname(dotGitPath), gitDir);
}

function readCurrentBranch() {
  const headPath = join(resolveGitDir(), "HEAD");
  const head = readFileSync(headPath, "utf8").trim();

  if (!head.startsWith("ref: ")) {
    return "";
  }

  return head.replace("ref: refs/heads/", "");
}

function getBranchName() {
  const githubBranch =
    process.env.GITHUB_HEAD_REF?.trim() || process.env.GITHUB_REF_NAME?.trim();

  if (githubBranch) {
    return githubBranch;
  }

  return readCurrentBranch();
}

function readCommitMessageHeader(input) {
  const resolvedInput = resolve(process.cwd(), input);

  if (existsSync(resolvedInput) && statSync(resolvedInput).isFile()) {
    return readFileSync(resolvedInput, "utf8").split(/\r?\n/u)[0]?.trim() ?? "";
  }

  return input.trim();
}

function getRequiredScope(branch) {
  const branchMatch = branch.match(
    /^(feature|fix|chore|docs|refactor|test)\/((e-\d{2}[a-z]?-\d{2})|ops)-/u,
  );

  return branchMatch?.[2] ?? null;
}

const commitMessageArg = process.argv[2]?.trim();

if (!commitMessageArg) {
  console.error("Commit message validation requires a message file path.");
  process.exit(1);
}

const branch = getBranchName();
const message = readCommitMessageHeader(commitMessageArg);
const requiredScope = getRequiredScope(branch);
const conventionalCommitPattern =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|test)(\(([a-z0-9-]+)\))?(!)?: .+/u;
const bypassPatterns = [/^Merge /u, /^Revert "/u, /^(fixup|squash)! /u];

if (bypassPatterns.some((pattern) => pattern.test(message))) {
  process.exit(0);
}

const commitMatch = message.match(conventionalCommitPattern);

if (!commitMatch) {
  console.error(
    [
      `Invalid commit message: ${message || "<empty>"}`,
      "Use conventional commits, for example: feat(e-00b-02): add available stock query",
    ].join("\n"),
  );
  process.exit(1);
}

const scope = commitMatch[3] ?? null;

if (requiredScope && scope !== requiredScope) {
  console.error(
    [
      `Commit scope mismatch for branch ${branch}.`,
      `Expected scope: ${requiredScope}`,
      `Received message: ${message}`,
      `Example: feat(${requiredScope}): short summary`,
    ].join("\n"),
  );
  process.exit(1);
}
