// tests/sprites.test.ts — 精灵图渲染测试
import { describe, test, expect } from "bun:test";
import { renderSprite, BODIES, HAT_LINES } from "../src/core/sprites";
import { SPECIES, HATS } from "../src/types";

describe("BODIES", () => {
  test("has entry for all 18 species", () => {
    for (const sp of SPECIES) {
      expect(BODIES[sp]).toBeDefined();
      expect(BODIES[sp].length).toBe(3); // 3 frames
    }
  });
});

describe("HAT_LINES", () => {
  test("has entry for all hats", () => {
    for (const hat of HATS) {
      expect(HAT_LINES[hat]).toBeDefined();
    }
  });
});

describe("renderSprite", () => {
  test("returns 3 frames for each species", () => {
    for (const sp of SPECIES) {
      const frames = renderSprite(sp);
      expect(frames.length).toBe(3);
    }
  });

  test("each frame has 5 lines", () => {
    for (const sp of SPECIES) {
      const frames = renderSprite(sp);
      for (const frame of frames) {
        expect(frame.length).toBe(5);
      }
    }
  });

  test("unknown species returns fallback", () => {
    const frames = renderSprite("unknown");
    expect(frames.length).toBe(1);
    expect(frames[0]).toEqual(["  ???  "]);
  });

  test("hat applied when first line is empty", () => {
    const frames = renderSprite("duck", "crown");
    // First frame first line should be the crown hat line
    expect(frames[0][0].trim().length).toBeGreaterThan(0);
  });

  test("no hat applied when hat is none or undefined", () => {
    const framesNoHat = renderSprite("duck");
    const framesNone = renderSprite("duck", "none");
    expect(framesNoHat).toEqual(framesNone);
  });
});
