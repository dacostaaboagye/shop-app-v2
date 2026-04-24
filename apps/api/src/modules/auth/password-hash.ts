import { compareSync, hashSync } from "bcryptjs";

export const PASSWORD_HASH_COST_FACTOR = 12;

export function hashPassword(password: string): string {
  return hashSync(password, PASSWORD_HASH_COST_FACTOR);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): boolean {
  if (!passwordHash.startsWith("$2")) {
    return false;
  }

  try {
    return compareSync(password, passwordHash);
  } catch {
    return false;
  }
}
