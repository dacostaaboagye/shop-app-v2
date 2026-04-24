export type DatabaseEnv = {
  databaseUrl: string;
};

export function getDatabaseEnv(): DatabaseEnv {
  return {
    databaseUrl: process.env.DATABASE_URL?.trim() ?? "",
  };
}
