import { readFileSync, statSync } from "node:fs";
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

const branch = getBranchName();
const allowedBranches = new Set(["dev", "develop", "main", "master"]);
const branchPattern =
  /^(feature|fix|chore|docs|refactor|test)\/((e-\d{2}[a-z]?-\d{2})|ops)-[a-z0-9-]+$/;

if (allowedBranches.has(branch) || branchPattern.test(branch)) {
  console.log(`Branch name accepted: ${branch}`);
  process.exit(0);
}

console.error(
  [
    `Invalid branch name: ${branch || "<detached>"}`,
    "Use dev/main/master/develop or a ticket-based branch such as feature/e-01-01-auth-foundation.",
  ].join("\n"),
);
process.exit(1);
