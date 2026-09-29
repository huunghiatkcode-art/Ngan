import "server-only";
import bcrypt from "bcryptjs";

const ROUNDS = 10;

export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, ROUNDS);
}

export async function verifySecret(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}
