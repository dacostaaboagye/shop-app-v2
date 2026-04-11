import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";
import { getDatabaseEnv } from "./src/env.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const envFile = resolve(__dirname, "../../.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  dbCredentials: {
    url: getDatabaseEnv().databaseUrl,
  },
});
