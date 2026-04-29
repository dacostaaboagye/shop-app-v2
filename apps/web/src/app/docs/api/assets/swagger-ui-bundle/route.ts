import { readFile } from "node:fs/promises";
import path from "node:path";

const swaggerBundlePath = path.join(
  process.cwd(),
  "node_modules",
  "swagger-ui-react",
  "swagger-ui-bundle.js",
);
const swaggerBundlePromise = readFile(swaggerBundlePath, "utf8");

export async function GET() {
  const bundle = await swaggerBundlePromise;

  return new Response(bundle, {
    headers: {
      "cache-control": "public, max-age=3600",
      "content-type": "application/javascript; charset=utf-8",
    },
  });
}
