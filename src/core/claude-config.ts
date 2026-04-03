// src/core/claude-config.ts — ~/.claude.json 读写 + 备份
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export function getClaudeConfigPath(): string {
  return join(homedir(), ".claude.json");
}

export function readClaudeConfig(configPath?: string): Record<string, any> | null {
  const path = configPath ?? getClaudeConfigPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function writeClaudeConfig(configPath: string, config: Record<string, any>): void {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined) clean[key] = value;
  }
  writeFileSync(configPath, JSON.stringify(clean, null, 2) + "\n");
}

export function backupConfig(configPath?: string): string {
  const path = configPath ?? getClaudeConfigPath();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const bakPath = `${path}.bak-${timestamp}`;
  if (existsSync(path)) {
    copyFileSync(path, bakPath);
  }
  return bakPath;
}

export function applyUserID(newUserID: string, configPath?: string): boolean {
  const path = configPath ?? getClaudeConfigPath();
  const config = readClaudeConfig(path);
  if (!config) return false;
  config.userID = newUserID;
  delete config.companion;
  writeClaudeConfig(path, config);
  return true;
}
