import argon2 from 'argon2';

/**
 * Hashes a plaintext password using Argon2id with secure production-ready parameters.
 * These parameters are identical to the P3K Admin Dashboard authentication implementation.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
    hashLength: 32,
  });
}

/**
 * Verifies a plaintext password against an Argon2id hash.
 * Returns true if valid, false otherwise (handling any malformed hash errors gracefully).
 */
export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}
