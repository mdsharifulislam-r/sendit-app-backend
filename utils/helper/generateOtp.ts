import { randomInt } from 'crypto';

/**
 * Generates a cryptographically secure 4-digit OTP (1000–9999).
 */
const generateOTP = (): number => randomInt(1000, 10000);

export default generateOTP;
