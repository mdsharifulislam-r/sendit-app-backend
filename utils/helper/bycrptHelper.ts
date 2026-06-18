import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Synchronously hashes a password.
 * Used in @BeforeInsert hooks where async is not supported.
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/**
 * Asynchronously compares a plain-text password with a hash.
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(plainPassword, hashedPassword);
}
