import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const contractsRoot = join(process.cwd(), "packages", "contracts", "src");
const contractFiles = [];
const allowList = ["internalId", "providerId"];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (entry.endsWith(".ts")) {
      contractFiles.push(fullPath);
    }
  }
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

walk(contractsRoot);

for (const filePath of contractFiles) {
  const source = readFileSync(filePath, "utf8");
  const matches = source.matchAll(/\b([A-Za-z0-9_]*id)\s*:/g);

  for (const match of matches) {
    const key = match[1];

    if (!allowList.includes(key)) {
      fail(
        `Public contract exposes forbidden id field "${key}" in ${filePath}`,
      );
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Public ID guard passed for ${contractFiles.length} file(s).`);
