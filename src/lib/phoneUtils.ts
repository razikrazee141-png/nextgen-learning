/**
 * Phone utilities for Indian numbers (+91)
 * Validates 10-digit numbers and formats to E.164 (+91XXXXXXXXXX)
 */

export const PHONE_DOMAIN_SUFFIX = '@phone.nextgen.local';

/**
 * Strips formatting (spaces, dashes, parens, +91 prefix, leading 0)
 * Returns a 10-digit string if valid, or null if invalid.
 */
export function extractIndianPhoneDigits(raw: string): string | null {
  if (!raw) return null;
  
  // Remove all non-numeric characters
  const clean = raw.trim().replace(/\D/g, '');
  
  // 12 digits: e.g. 919876543210
  if (clean.length === 12 && clean.startsWith('91')) {
    const digits = clean.slice(2);
    return isValidIndianTenDigit(digits) ? digits : null;
  }
  
  // 11 digits: e.g. 09876543210 (leading zero)
  if (clean.length === 11 && clean.startsWith('0')) {
    const digits = clean.slice(1);
    return isValidIndianTenDigit(digits) ? digits : null;
  }
  
  // 10 digits: e.g. 9876543210
  if (clean.length === 10) {
    return isValidIndianTenDigit(clean) ? clean : null;
  }
  
  return null;
}

function isValidIndianTenDigit(digits: string): boolean {
  // Indian mobile numbers typically begin with 6, 7, 8, or 9
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Converts raw phone input to E.164 format: +91XXXXXXXXXX
 */
export function formatToE164(raw: string): string | null {
  const digits = extractIndianPhoneDigits(raw);
  if (!digits) return null;
  return `+91${digits}`;
}

/**
 * Checks whether an input string is an email address
 */
export function isEmail(input: string): boolean {
  const trimmed = input.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Converts a 10-digit Indian phone to the internal placeholder email for "simple" mode
 * e.g. 9876543210 -> 919876543210@phone.nextgen.local
 */
export function phoneToSimpleEmail(phoneDigits: string): string {
  return `91${phoneDigits}${PHONE_DOMAIN_SUFFIX}`;
}

/**
 * Converts an internal placeholder email back to a clean readable phone number (+91 XXXXX XXXXX)
 */
export function simpleEmailToPhone(email: string): string | null {
  if (!email || !email.endsWith(PHONE_DOMAIN_SUFFIX)) return null;
  const username = email.replace(PHONE_DOMAIN_SUFFIX, '');
  if (username.startsWith('91') && username.length === 12) {
    const digits = username.slice(2);
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return username;
}

/**
 * Formats a phone number for display (+91 XXXXX XXXXX)
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = extractIndianPhoneDigits(phone);
  if (!digits) return phone;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}
