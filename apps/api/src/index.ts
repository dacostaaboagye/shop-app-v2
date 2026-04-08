import { createServer } from "./server/create-server.js";

const server = createServer();

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? "4000");

try {
  await server.listen({ host, port });
  server.log.info(`API listening on http://${host}:${port}`);
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
