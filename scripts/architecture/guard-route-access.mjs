import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const routesRoot =
  process.env.ROUTE_ACCESS_GUARD_ROOT ??
  join(process.cwd(), "apps", "api", "src", "modules");
const routeFiles = [];
const routeCallPattern =
  /\b[A-Za-z_$][\w$]*\s*\.\s*(route|get|post|put|patch|delete)\s*\(/g;

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

function maskCommentsAndStrings(source) {
  let masked = "";
  let state = "code";
  let quote = "";

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (state === "line-comment") {
      masked += char === "\n" ? "\n" : " ";
      if (char === "\n") state = "code";
      continue;
    }

    if (state === "block-comment") {
      masked += char === "\n" ? "\n" : " ";
      if (char === "*" && next === "/") {
        masked += " ";
        index += 1;
        state = "code";
      }
      continue;
    }

    if (state === "string") {
      masked += char === "\n" ? "\n" : " ";
      if (char === "\\") {
        masked += next === "\n" ? "\n" : " ";
        index += 1;
        continue;
      }
      if (char === quote) state = "code";
      continue;
    }

    if (char === "/" && next === "/") {
      masked += "  ";
      index += 1;
      state = "line-comment";
      continue;
    }

    if (char === "/" && next === "*") {
      masked += "  ";
      index += 1;
      state = "block-comment";
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      masked += " ";
      quote = char;
      state = "string";
      continue;
    }

    masked += char;
  }

  return masked;
}

function findMatchingParen(source, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function hasAccessMetadata(callSource) {
  return /\bconfig\s*:\s*{[\s\S]*\baccess\b/.test(callSource);
}

function looksLikeRouteRegistration(callSource, originalCallSource) {
  return (
    /\.\s*route\s*\(\s*{/.test(callSource) ||
    (/\.\s*(?:get|post|put|patch|delete)\s*\(\s*["'`]\//.test(
      originalCallSource,
    ) &&
      hasTopLevelComma(callSource))
  );
}

function hasTopLevelComma(callSource) {
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (const char of callSource) {
    if (char === "(") parenDepth += 1;
    if (char === ")") parenDepth -= 1;
    if (char === "{") braceDepth += 1;
    if (char === "}") braceDepth -= 1;
    if (char === "[") bracketDepth += 1;
    if (char === "]") bracketDepth -= 1;
    if (
      char === "," &&
      parenDepth === 1 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      return true;
    }
  }

  return false;
}

walk(routesRoot);

let routeCallCount = 0;

for (const filePath of routeFiles) {
  const source = readFileSync(filePath, "utf8");
  const masked = maskCommentsAndStrings(source);
  const matches = masked.matchAll(routeCallPattern);

  for (const match of matches) {
    const openIndex = masked.indexOf("(", match.index);
    const closeIndex = findMatchingParen(masked, openIndex);

    if (closeIndex === -1) {
      fail(
        `Unable to parse route registration in ${filePath}:${lineNumber(source, match.index)}`,
      );
      continue;
    }

    const routeCall = masked.slice(match.index, closeIndex + 1);
    const originalRouteCall = source.slice(match.index, closeIndex + 1);
    if (!looksLikeRouteRegistration(routeCall, originalRouteCall)) {
      continue;
    }
    routeCallCount += 1;

    if (!hasAccessMetadata(routeCall)) {
      fail(
        `Missing access metadata in ${filePath}:${lineNumber(source, match.index)}`,
      );
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(
  `Route access guard passed for ${routeCallCount} route registration(s) across ${routeFiles.length} file(s).`,
);
