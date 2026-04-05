// src/core/license.ts — License key verification and generation
import { sign, verify } from "crypto";

export interface LicensePayload {
  tier: "pro";
  issued: number;  // Unix timestamp
  features: string[];
}

/**
 * Format a license key string with BR- prefix
 * Internal format: base64url(payload) + "." + base64url(signature)
 * No visual grouping — base64url uses - and _ which would conflict with dash separators
 */
export function formatLicenseKey(internalKey: string): string {
  const cleanKey = internalKey.replace(/^BR-/, "");
  return "BR-" + cleanKey;
}

/**
 * Parse a BR- formatted license key back to internal format
 */
export function parseLicenseKey(formattedKey: string): string | null {
  if (!formattedKey.startsWith("BR-")) return null;
  const clean = formattedKey.substring(3); // Remove "BR-" prefix only
  if (clean.length < 10) return null;
  return clean;
}

/**
 * Convert string to base64url encoding (URL-safe, no padding)
 */
function base64urlEncode(data: Buffer): string {
  return data.toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Convert base64url string back to Buffer
 */
function base64urlDecode(str: string): Buffer {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  return Buffer.from(padded, "base64");
}

/**
 * Verify a license key string, return payload or null
 */
export function verifyLicenseKey(key: string, publicKeyPEM: string): LicensePayload | null {
  try {
    const cleanKey = parseLicenseKey(key);
    if (!cleanKey) return null;

    // Split payload and signature
    const parts = cleanKey.split(".");
    if (parts.length !== 2) return null;

    const payloadBuf = base64urlDecode(parts[0]);
    const signature = base64urlDecode(parts[1]);

    // Verify signature using Ed25519
    const isValid = verify(
      null,
      Buffer.from(parts[0], "utf8"),
      {
        key: publicKeyPEM,
        format: "pem",
        type: "spki",
      },
      signature
    );

    if (!isValid) return null;

    // Parse payload
    const payload: LicensePayload = JSON.parse(payloadBuf.toString("utf8"));

    // Validate payload structure
    if (payload.tier !== "pro") return null;
    if (typeof payload.issued !== "number") return null;
    if (!Array.isArray(payload.features)) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate a license key (developer use only)
 */
export function generateLicenseKey(
  payload: LicensePayload,
  privateKeyPEM: string
): string {
  // Create payload JSON
  const payloadJSON = JSON.stringify(payload);
  const payloadBuf = Buffer.from(payloadJSON, "utf8");

  // Encode as base64url
  const payloadBase64url = base64urlEncode(payloadBuf);

  // Sign the base64url payload string using Ed25519
  const signature = sign(
    null,
    Buffer.from(payloadBase64url, "utf8"),
    {
      key: privateKeyPEM,
      format: "pem",
      type: "pkcs8",
    }
  );

  // Encode signature as base64url
  const signatureBase64url = base64urlEncode(signature);

  // Combine: payload.signature
  const internalKey = `${payloadBase64url}.${signatureBase64url}`;

  // Format as BR-XXXX-XXXX-XXXX-XXXX
  return formatLicenseKey(internalKey);
}
