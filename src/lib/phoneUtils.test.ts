import { describe, it, expect } from 'vitest';
import {
  extractIndianPhoneDigits,
  formatToE164,
  isEmail,
  phoneToSimpleEmail,
  simpleEmailToPhone,
  formatPhoneForDisplay,
} from './phoneUtils';

describe('Phone Utilities (Indian Mobile Standards)', () => {
  it('extracts valid 10-digit Indian numbers', () => {
    expect(extractIndianPhoneDigits('9876543210')).toBe('9876543210');
    expect(extractIndianPhoneDigits('8123456789')).toBe('8123456789');
    expect(extractIndianPhoneDigits('7000011111')).toBe('7000011111');
    expect(extractIndianPhoneDigits('6999988888')).toBe('6999988888');
    expect(extractIndianPhoneDigits('1234567890')).toBe('1234567890');
  });

  it('handles +91 prefix and formatting characters', () => {
    expect(extractIndianPhoneDigits('+919876543210')).toBe('9876543210');
    expect(extractIndianPhoneDigits('+91 98765 43210')).toBe('9876543210');
    expect(extractIndianPhoneDigits('+91-98765-43210')).toBe('9876543210');
    expect(extractIndianPhoneDigits('91 9876543210')).toBe('9876543210');
  });

  it('handles leading zero formatting (09876543210)', () => {
    expect(extractIndianPhoneDigits('09876543210')).toBe('9876543210');
  });

  it('rejects invalid numbers', () => {
    // Too short
    expect(extractIndianPhoneDigits('987654321')).toBeNull();
    // Too long
    expect(extractIndianPhoneDigits('987654321000123')).toBeNull();
    // Letters
    expect(extractIndianPhoneDigits('abc9876543')).toBeNull();
  });

  it('formats to E.164 (+91XXXXXXXXXX)', () => {
    expect(formatToE164('9876543210')).toBe('+919876543210');
    expect(formatToE164('+91 98765-43210')).toBe('+919876543210');
    expect(formatToE164('invalid')).toBeNull();
  });

  it('correctly detects emails vs phone identifiers', () => {
    expect(isEmail('student@example.com')).toBe(true);
    expect(isEmail('john.doe+test@gmail.co.in')).toBe(true);
    expect(isEmail('9876543210')).toBe(false);
    expect(isEmail('+919876543210')).toBe(false);
    expect(isEmail('not-an-email')).toBe(false);
  });

  it('converts phone to internal simple email and back', () => {
    const internal = phoneToSimpleEmail('9876543210');
    expect(internal).toBe('919876543210@phone.nextgen.local');

    const display = simpleEmailToPhone(internal);
    expect(display).toBe('+91 98765 43210');
  });

  it('formats phone numbers for clean display', () => {
    expect(formatPhoneForDisplay('+919876543210')).toBe('+91 98765 43210');
    expect(formatPhoneForDisplay('9876543210')).toBe('+91 98765 43210');
  });
});
