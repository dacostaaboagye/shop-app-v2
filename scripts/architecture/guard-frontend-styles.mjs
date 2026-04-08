import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(process.cwd(), "apps", "web", "src");
const files = [];
const forbiddenPatterns = [
  {
    pattern:
      /\b(bg|text|border|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
    message:
      "Use semantic design tokens and variants instead of raw Tailwind palette classes.",
  },
  {
    pattern: /\bspace-[xy]-\d+\b/,
    message: "Use flex/grid gap utilities instead of space-x/space-y.",
  },
  {
    pattern: /#[0-9a-fA-F]{3,8}/,
    message:
      "Do not hardcode hex colors in frontend source files. Use the design tokens in globals.css.",
  },
];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

walk(webRoot);

for (const filePath of files) {
  const source = readFileSync(filePath, "utf8");

  for (const rule of forbiddenPatterns) {
    if (rule.pattern.test(source)) {
      fail(`${rule.message}\nFound in ${filePath}`);
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Frontend style guard passed for ${files.length} file(s).`);
