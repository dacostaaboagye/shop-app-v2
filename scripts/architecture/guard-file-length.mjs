import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceRoots = [
  join(root, "apps", "api", "src"),
  join(root, "apps", "web", "src"),
  join(root, "packages", "contracts", "src"),
  join(root, "packages", "database", "src"),
  join(root, "packages", "domain", "src"),
];

const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const maxSourceLines = 250;
const maxTestLines = 350;

const violations = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    const extension = entry.slice(entry.lastIndexOf("."));

    if (!allowedExtensions.has(extension)) {
      continue;
    }

    const source = readFileSync(fullPath, "utf8");
    const lines = source.split(/\r?\n/).length;
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry);
    const limit = isTestFile ? maxTestLines : maxSourceLines;

    if (lines > limit) {
      violations.push({
        lines,
        limit,
        path: relative(root, fullPath),
      });
    }
  }
}

for (const directory of sourceRoots) {
  walk(directory);
}

if (violations.length) {
  console.error(
    [
      "File length guard failed. Split large files before they become architectural drag.",
      ...violations.map(
        ({ lines, limit, path }) =>
          `- ${path}: ${lines} lines (limit ${limit})`,
      ),
      `Source files are limited to ${maxSourceLines} lines; test files are limited to ${maxTestLines} lines.`,
    ].join("\n"),
  );
  process.exit(1);
}

console.log(
  `File length guard passed for ${sourceRoots.length} source root(s).`,
);
