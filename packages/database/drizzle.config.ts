import { defineConfig } from "drizzle-kit";
import { getDatabaseEnv } from "./src/env.js";

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  dbCredentials: {
    url: getDatabaseEnv().databaseUrl,
  },
});
