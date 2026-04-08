import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const routesRoot = join(process.cwd(), "apps", "api", "src", "modules");
const routeFiles = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (entry.endsWith(".routes.ts")) {
      routeFiles.push(fullPath);
    }
  }
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

walk(routesRoot);

for (const filePath of routeFiles) {
  const source = readFileSync(filePath, "utf8");

  if (!source.includes("access:")) {
    fail(`Missing access metadata in ${filePath}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Route access guard passed for ${routeFiles.length} file(s).`);
