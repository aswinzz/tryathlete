/**
 * AES-256-GCM symmetric encryption for sensitive values stored in the DB
 * (e.g. third-party credentials that must be retrieved in plaintext for API calls).
 *
 * Requires ENCRYPTION_KEY env var — 64 hex chars (32 bytes).
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Stored format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES   = 12; // 96-bit IV recommended for GCM
const TAG_BYTES  = 16; // 128-bit auth tag

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY env var is missing or wrong length. " +
      "Set it to a 64-char hex string (32 bytes). " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/** Encrypt a plaintext string. Returns "<iv>:<tag>:<ciphertext>" (all hex). */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv  = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a value produced by `encrypt`.
 * If the value looks like plain text (no ":" separators in the expected positions),
 * it is returned as-is — this allows a graceful migration window for values that
 * were stored before encryption was introduced.
 */
export function decrypt(stored: string): string {
  const parts = stored.split(":");
  // Our format always has exactly 3 colon-separated segments of specific lengths
  if (parts.length !== 3) return stored; // plain-text fallback

  const [ivHex, tagHex, dataHex] = parts;
  if (ivHex.length !== IV_BYTES * 2 || tagHex.length !== TAG_BYTES * 2) {
    return stored; // wrong segment lengths → treat as plain text
  }

  try {
    const key     = getKey();
    const iv      = Buffer.from(ivHex, "hex");
    const tag     = Buffer.from(tagHex, "hex");
    const data    = Buffer.from(dataHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data).toString("utf8") + decipher.final("utf8");
  } catch {
    // Auth tag mismatch or wrong key — return raw value rather than crashing
    // (covers any remaining plain-text legacy values that happen to contain colons)
    return stored;
  }
}
