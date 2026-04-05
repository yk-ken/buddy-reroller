// src/core/license-store.ts — License persistence (encrypted, machine-bound)
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { encrypt, decrypt } from "./crypto";
import type { LicensePayload } from "./license";

const LICENSE_DIR = join(homedir(), ".buddy-reroller");
const LICENSE_FILE = join(LICENSE_DIR, "license.enc");

interface LicenseData {
  key: string;
  activatedAt: string;
  payload: LicensePayload;
}

/**
 * Save license data to encrypted storage
 */
export function saveLicense(data: LicenseData): void {
  try {
    // Ensure directory exists
    if (!existsSync(LICENSE_DIR)) {
      mkdirSync(LICENSE_DIR, { recursive: true });
    }

    // Encrypt and save
    const plaintext = JSON.stringify(data);
    const ciphertext = encrypt(plaintext);
    writeFileSync(LICENSE_FILE, ciphertext, "utf8");
  } catch (error) {
    console.error("Failed to save license:", error);
    throw new Error("Failed to save license");
  }
}

/**
 * Load license data from encrypted storage
 */
export function loadLicense(): LicenseData | null {
  try {
    if (!existsSync(LICENSE_FILE)) {
      return null;
    }

    const ciphertext = readFileSync(LICENSE_FILE, "utf8");
    const plaintext = decrypt(ciphertext);

    if (!plaintext) {
      return null;
    }

    const data: LicenseData = JSON.parse(plaintext);
    return data;
  } catch (error) {
    console.error("Failed to load license:", error);
    return null;
  }
}

/**
 * Check if Pro is activated via license
 */
export function isProActivated(): boolean {
  const license = loadLicense();
  return license !== null;
}

/**
 * Clear license data
 */
export function clearLicense(): void {
  try {
    if (existsSync(LICENSE_FILE)) {
      unlinkSync(LICENSE_FILE);
    }
  } catch (error) {
    console.error("Failed to clear license:", error);
    throw new Error("Failed to clear license");
  }
}
