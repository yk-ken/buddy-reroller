// tests/claude-config.test.ts — Claude 配置读写测试
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { readClaudeConfig, writeClaudeConfig, backupConfig, applyUserID } from "../src/core/claude-config";

const TEST_DIR = join(tmpdir(), "buddy-reroller-test-" + Date.now());
const TEST_CONFIG = join(TEST_DIR, "claude.json");

beforeEach(() => {
  if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("readClaudeConfig", () => {
  test("returns null for non-existent file", () => {
    expect(readClaudeConfig(join(TEST_DIR, "nope.json"))).toBeNull();
  });

  test("reads valid JSON", () => {
    writeFileSync(TEST_CONFIG, JSON.stringify({ userID: "abc123" }));
    const config = readClaudeConfig(TEST_CONFIG);
    expect(config).toEqual({ userID: "abc123" });
  });

  test("returns null for invalid JSON", () => {
    writeFileSync(TEST_CONFIG, "not json");
    expect(readClaudeConfig(TEST_CONFIG)).toBeNull();
  });
});

describe("writeClaudeConfig", () => {
  test("writes clean JSON without undefined values", () => {
    writeClaudeConfig(TEST_CONFIG, { a: 1, b: undefined, c: "hi" });
    const raw = readFileSync(TEST_CONFIG, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ a: 1, c: "hi" });
    expect(parsed).not.toHaveProperty("b");
  });
});

describe("backupConfig", () => {
  test("creates backup file", () => {
    writeFileSync(TEST_CONFIG, JSON.stringify({ test: true }));
    const bakPath = backupConfig(TEST_CONFIG);
    expect(existsSync(bakPath)).toBe(true);
    const bak = JSON.parse(readFileSync(bakPath, "utf-8"));
    expect(bak).toEqual({ test: true });
  });

  test("backup path contains timestamp", () => {
    writeFileSync(TEST_CONFIG, "{}");
    const bakPath = backupConfig(TEST_CONFIG);
    expect(bakPath).toContain(".bak-");
  });
});

describe("applyUserID", () => {
  test("applies userID and removes companion", () => {
    writeFileSync(TEST_CONFIG, JSON.stringify({ userID: "old", companion: { name: "duck" } }));
    const result = applyUserID("new-id", TEST_CONFIG);
    expect(result).toBe(true);
    const config = JSON.parse(readFileSync(TEST_CONFIG, "utf-8"));
    expect(config.userID).toBe("new-id");
    expect(config).not.toHaveProperty("companion");
  });

  test("returns false when config missing", () => {
    expect(applyUserID("id", join(TEST_DIR, "missing.json"))).toBe(false);
  });
});
