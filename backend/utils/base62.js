// Base62 character set: 0-9, a-z, A-Z (62 total characters)
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = ALPHABET.length;

/**
 * Encodes a non-negative integer into a Base62 string.
 * Uses repeated division by 62 and prepends mapped remainder characters.
 *
 * @param {number} number - The sequential number to encode
 * @returns {string} - The resulting Base62 string
 */
export function encode(number) {
  if (!Number.isInteger(number) || number < 0) {
    throw new TypeError('Base62 encoding requires a non-negative integer.');
  }

  if (number === 0) {
    return ALPHABET[0];
  }

  let num = number;
  let result = '';

  while (num > 0) {
    const remainder = num % BASE;
    result = ALPHABET[remainder] + result;
    num = Math.floor(num / BASE);
  }

  return result;
}
