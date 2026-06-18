import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure random hex token.
 * @param length Number of random bytes (default: 32 → 64 hex chars)
 */
const cryptoToken = (length = 32): string => randomBytes(length).toString('hex');

export default cryptoToken;
