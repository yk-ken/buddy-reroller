// tests/crypto.test.ts — 加密/解密测试
import { describe, test, expect, beforeEach } from "bun:test";
import { encrypt, decrypt } from "../src/core/crypto";

describe("crypto", () => {
  test("encrypt returns base64 string", () => {
    const result = encrypt("hello world");
    expect(typeof result).toBe("string");
    // base64 characters only
    expect(result).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  test("decrypt recovers original text", () => {
    const original = "test-data-123";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  test("different inputs produce different ciphertexts", () => {
    const a = encrypt("data-a");
    const b = encrypt("data-b");
    expect(a).not.toBe(b);
  });

  test("same input produces different ciphertexts (random IV)", () => {
    const a = encrypt("same-data");
    const b = encrypt("same-data");
    expect(a).not.toBe(b);
    // But both decrypt correctly
    expect(decrypt(a)).toBe("same-data");
    expect(decrypt(b)).toBe("same-data");
  });

  test("decrypt returns null for invalid input", () => {
    expect(decrypt("not-valid-base64!!!")).toBeNull();
  });

  test("handles JSON data", () => {
    const data = JSON.stringify([{ id: "abc", name: "test", count: 42 }]);
    const encrypted = encrypt(data);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(data);
    expect(JSON.parse(decrypted!)).toEqual([{ id: "abc", name: "test", count: 42 }]);
  });

  test("handles unicode", () => {
    const data = "你好世界 🐥🎮✨";
    const encrypted = encrypt(data);
    expect(decrypt(encrypted)).toBe(data);
  });
});
