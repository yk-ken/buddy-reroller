// tests/buddy.test.ts — 核心算法测试
import { describe, test, expect } from "bun:test";
import { mulberry32, hashSeed, pick, rollRarity, rollCompanion } from "../src/core/buddy";
import { SPECIES, RARITIES, STAT_NAMES, SALT } from "../src/types";

describe("mulberry32", () => {
  test("deterministic output", () => {
    const rng = mulberry32(12345);
    const a = rng();
    const b = rng();
    const rng2 = mulberry32(12345);
    expect(rng2()).toBe(a);
    expect(rng2()).toBe(b);
  });

  test("output in [0, 1)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("hashSeed", () => {
  test("returns a number", () => {
    const h = hashSeed("test");
    expect(typeof h).toBe("number");
  });

  test("deterministic", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
  });

  test("different inputs differ", () => {
    expect(hashSeed("a")).not.toBe(hashSeed("b"));
  });
});

describe("pick", () => {
  test("picks from array", () => {
    const arr = [1, 2, 3];
    const rng = mulberry32(100);
    const val = pick(rng, arr);
    expect(arr).toContain(val);
  });
});

describe("rollRarity", () => {
  test("returns valid rarity", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const r = rollRarity(rng);
      expect(RARITIES).toContain(r);
    }
  });
});

describe("rollCompanion", () => {
  test("returns valid companion", () => {
    const c = rollCompanion("test-user-123");
    expect(SPECIES).toContain(c.species);
    expect(RARITIES).toContain(c.rarity);
    expect(STAT_NAMES).toContain(c.peakStat);
    expect(STAT_NAMES).toContain(c.dumpStat);
    expect(c.peakStat).not.toBe(c.dumpStat);
    expect(typeof c.shiny).toBe("boolean");
  });

  test("deterministic", () => {
    const a = rollCompanion("same-input");
    const b = rollCompanion("same-input");
    expect(a).toEqual(b);
  });

  test("different inputs produce different results", () => {
    const a = rollCompanion("input-a");
    const b = rollCompanion("input-b");
    // Very unlikely to be equal
    expect(a.species === b.species && a.rarity === b.rarity && a.eye === b.eye).toBeFalsy();
  });

  test("stats are within valid range", () => {
    for (let i = 0; i < 50; i++) {
      const c = rollCompanion(`stat-test-${i}`);
      for (const stat of STAT_NAMES) {
        expect(c.stats[stat]).toBeGreaterThanOrEqual(1);
        expect(c.stats[stat]).toBeLessThanOrEqual(100);
      }
    }
  });

  test("common companions have no hat", () => {
    // Test many to cover the common case
    let foundCommon = false;
    for (let i = 0; i < 200; i++) {
      const c = rollCompanion(`hat-test-${i}`);
      if (c.rarity === "common") {
        foundCommon = true;
        expect(c.hat).toBe("none");
      }
    }
    // Should have found at least one common
    expect(foundCommon).toBe(true);
  });
});
