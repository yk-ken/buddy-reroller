// src/api/apply.ts — POST /api/apply
import { applyUserID, backupConfig, getClaudeConfigPath } from "../core/claude-config";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { encrypt, decrypt } from "../core/crypto";
import type { CollectionEntry } from "../types";

const COLLECTION_FILE = join(homedir(), ".buddy-reroller", "collection.enc");

function resetCollectionApplied() {
  if (!existsSync(COLLECTION_FILE)) return;
  try {
    const encrypted = readFileSync(COLLECTION_FILE, "utf-8").trim();
    const json = decrypt(encrypted);
    if (!json) return;
    const entries: CollectionEntry[] = JSON.parse(json);
    let changed = false;
    for (const e of entries) {
      if (e.applied) { e.applied = false; changed = true; }
    }
    if (changed) writeFileSync(COLLECTION_FILE, encrypt(JSON.stringify(entries)));
  } catch { /* ignore */ }
}

export async function handleApply(req: Request): Promise<Response> {
  const { userID } = await req.json();
  if (!userID || typeof userID !== "string") {
    return Response.json({ error: "userID required" }, { status: 400 });
  }
  const configPath = getClaudeConfigPath();
  backupConfig(configPath);
  const success = applyUserID(userID, configPath);
  if (success) {
    resetCollectionApplied();
    return Response.json({ success: true, message: "Applied! Restart Claude Code and run /buddy" });
  }
  return Response.json({ error: "Failed to apply" }, { status: 500 });
}
