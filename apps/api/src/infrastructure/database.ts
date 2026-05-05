import { Duplex } from "node:stream";
import tls, { type TLSSocket } from "node:tls";
import * as schema from "@shop/database";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

const DIRECT_TLS_ALPN_PROTOCOL = "postgresql";
const DEFAULT_CONNECTION_TIMEOUT_MS = 15_000;
const DIRECT_TLS_SSL_MODES = new Set([
  "prefer",
  "require",
  "verify-ca",
  "verify-full",
]);

export type ApiDatabase = NodePgDatabase<typeof schema>;

export type DatabaseRuntime = {
  db: ApiDatabase;
  pool: Pool;
};

export function createDatabaseRuntime(databaseUrl: string): DatabaseRuntime {
  const pool = new Pool(createPoolConfig(databaseUrl));

  return {
    db: drizzle(pool, { schema }),
    pool,
  };
}

export function createPoolConfig(databaseUrl: string): PoolConfig {
  const config: PoolConfig = {
    connectionString: databaseUrl,
    connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS,
  };

  if (!shouldUseDirectTls(databaseUrl)) {
    return config;
  }

  const url = new URL(databaseUrl);
  url.searchParams.delete("channel_binding");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslnegotiation");

  return {
    ...config,
    connectionString: url.toString(),
    ssl: false,
    stream: () => new DirectTlsPostgresStream(),
  };
}

export function shouldUseDirectTls(databaseUrl: string): boolean {
  const url = new URL(databaseUrl);
  const sslNegotiation = url.searchParams.get("sslnegotiation")?.toLowerCase();

  if (sslNegotiation === "direct") {
    return true;
  }

  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

  return (
    isNeonHost(url.hostname) &&
    sslMode !== undefined &&
    DIRECT_TLS_SSL_MODES.has(sslMode)
  );
}

function isNeonHost(hostname: string): boolean {
  return hostname.endsWith(".neon.tech");
}

class DirectTlsPostgresStream extends Duplex {
  private keepAlive: {
    enable: boolean;
    initialDelay?: number;
  } | null = null;
  private noDelay = true;
  private socket: TLSSocket | null = null;

  connect(port: number, host: string): this {
    const socket = tls.connect({
      ALPNProtocols: [DIRECT_TLS_ALPN_PROTOCOL],
      host,
      port,
      rejectUnauthorized: true,
      servername: host,
    });

    this.socket = socket;
    socket.setNoDelay(this.noDelay);

    if (this.keepAlive !== null) {
      socket.setKeepAlive(this.keepAlive.enable, this.keepAlive.initialDelay);
    }

    socket.on("secureConnect", () => this.emit("connect"));
    socket.on("data", (chunk: Buffer) => {
      if (!this.push(chunk)) {
        socket.pause();
      }
    });
    socket.on("end", () => this.push(null));
    socket.on("error", (error) => this.destroy(error));
    socket.on("close", () => {
      if (!this.destroyed) {
        this.destroy();
      }
    });

    return this;
  }

  setNoDelay(value = true): this {
    this.noDelay = value;
    this.socket?.setNoDelay(value);
    return this;
  }

  setKeepAlive(enable = false, initialDelay?: number): this {
    this.keepAlive =
      initialDelay === undefined ? { enable } : { enable, initialDelay };
    this.socket?.setKeepAlive(enable, initialDelay);
    return this;
  }

  ref(): this {
    this.socket?.ref();
    return this;
  }

  unref(): this {
    this.socket?.unref();
    return this;
  }

  override _read(): void {
    this.socket?.resume();
  }

  override _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (this.socket === null) {
      callback(
        new Error("Cannot write to PostgreSQL TLS stream before connect."),
      );
      return;
    }

    this.socket.write(chunk, encoding, callback);
  }

  override _final(callback: (error?: Error | null) => void): void {
    if (this.socket === null) {
      callback();
      return;
    }

    this.socket.end(callback);
  }

  override _destroy(
    error: Error | null,
    callback: (error?: Error | null) => void,
  ): void {
    this.socket?.destroy();
    this.socket = null;
    callback(error);
  }
}
