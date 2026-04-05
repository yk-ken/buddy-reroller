// tests/license.test.ts — License system tests
import { describe, test, expect } from "bun:test";
import { generateLicenseKey, verifyLicenseKey } from "../src/core/license";
import { PRO_PUBLIC_KEY } from "../src/pro/keys";
import { PRO_SECRET_KEY } from "../src/pro/secret-key";
import type { LicensePayload } from "../src/core/license";

describe("License System", () => {
  test("should generate and verify a license key", () => {
    const payload: LicensePayload = {
      tier: "pro",
      issued: Math.floor(Date.now() / 1000),
      features: ["all"],
    };

    const key = generateLicenseKey(payload, PRO_SECRET_KEY);
    expect(key.startsWith("BR-")).toBe(true);
    expect(key.length).toBeGreaterThan(20);

    const verified = verifyLicenseKey(key, PRO_PUBLIC_KEY);
    expect(verified).not.toBeNull();
    expect(verified?.tier).toBe("pro");
    expect(verified?.features).toEqual(["all"]);
    expect(verified?.issued).toBe(payload.issued);
  });

  test("should reject invalid license keys", () => {
    const invalidKey = "BR-INVALID-KEY-TEST-1234";
    const verified = verifyLicenseKey(invalidKey, PRO_PUBLIC_KEY);
    expect(verified).toBeNull();
  });

  test("should reject keys with wrong format", () => {
    const wrongFormat = "INVALID";
    const verified = verifyLicenseKey(wrongFormat, PRO_PUBLIC_KEY);
    expect(verified).toBeNull();
  });

  test("should reject tampered keys", () => {
    const payload: LicensePayload = {
      tier: "pro",
      issued: Math.floor(Date.now() / 1000),
      features: ["all"],
    };

    const key = generateLicenseKey(payload, PRO_SECRET_KEY);
    // Tamper with the key
    const tamperedKey = key.replace(/[A-Z0-9]/g, () => "X");

    const verified = verifyLicenseKey(tamperedKey, PRO_PUBLIC_KEY);
    expect(verified).toBeNull();
  });

  test("should verify multiple features", () => {
    const payload: LicensePayload = {
      tier: "pro",
      issued: Math.floor(Date.now() / 1000),
      features: ["feature1", "feature2", "feature3"],
    };

    const key = generateLicenseKey(payload, PRO_SECRET_KEY);
    const verified = verifyLicenseKey(key, PRO_PUBLIC_KEY);

    expect(verified).not.toBeNull();
    expect(verified?.features).toEqual(["feature1", "feature2", "feature3"]);
  });
});
