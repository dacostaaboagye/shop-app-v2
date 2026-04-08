import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");

  return `scrypt$${salt}$${digest}`;
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): boolean {
  const [algorithm, salt, storedDigest] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !salt || !storedDigest) {
    return false;
  }

  const derivedDigest = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  const storedBuffer = Buffer.from(storedDigest, "hex");

  if (storedBuffer.length !== derivedDigest.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedDigest);
}
