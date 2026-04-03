// src/api/collection.ts — 收藏集 CRUD（无数量限制）
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { encrypt, decrypt } from "../core/crypto";
import { applyUserID, backupConfig, getClaudeConfigPath } from "../core/claude-config";
import type { CollectionEntry } from "../types";

const COLLECTION_DIR = join(homedir(), ".buddy-reroller");
const COLLECTION_FILE = join(COLLECTION_DIR, "collection.enc");

function readCollection(): CollectionEntry[] {
  if (!existsSync(COLLECTION_FILE)) return [];
  try {
    const encrypted = readFileSync(COLLECTION_FILE, "utf-8").trim();
    const json = decrypt(encrypted);
    if (!json) return [];
    return JSON.parse(json);
  } catch { return []; }
}

function writeCollection(entries: CollectionEntry[]): void {
  if (!existsSync(COLLECTION_DIR)) mkdirSync(COLLECTION_DIR, { recursive: true });
  writeFileSync(COLLECTION_FILE, encrypt(JSON.stringify(entries)));
}

export async function handleCollection(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "GET") {
    return Response.json({ entries: readCollection() });
  }

  if (req.method === "POST" && url.pathname === "/api/collection/add") {
    const entry: CollectionEntry = await req.json();
    const entries = readCollection();
    entry.id = crypto.randomUUID().replace(/-/g, "");
    entry.foundAt = new Date().toISOString();
    entry.applied = false;
    entry.tags = entry.tags || [];
    entries.push(entry);
    writeCollection(entries);
    return Response.json({ success: true, entry });
  }

  if (req.method === "POST" && url.pathname === "/api/collection/apply") {
    const { id } = await req.json();
    const entries = readCollection();
    const entry = entries.find(e => e.id === id);
    if (!entry) return Response.json({ error: "Not found" }, { status: 404 });
    backupConfig(getClaudeConfigPath());
    applyUserID(entry.userID, getClaudeConfigPath());
    entry.applied = true;
    writeCollection(entries);
    return Response.json({ success: true });
  }

  if (req.method === "DELETE") {
    const { id } = await req.json();
    writeCollection(readCollection().filter(e => e.id !== id));
    return Response.json({ success: true });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
