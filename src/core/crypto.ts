// src/core/crypto.ts — AES-256-GCM 加密/解密
import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto";
import { getMachineId } from "./machine-id";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;

function deriveKey(): Buffer {
  const machineId = getMachineId();
  return createHash("sha256").update("buddy-reroller-v1:" + machineId).digest();
}

export function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // 格式: base64(iv + tag + ciphertext)
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string | null {
  try {
    const key = deriveKey();
    const raw = Buffer.from(ciphertext, "base64");
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
    const data = raw.subarray(IV_LEN + AUTH_TAG_LEN);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data) + decipher.final("utf8");
  } catch {
    return null;
  }
}
