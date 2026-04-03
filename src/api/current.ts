// src/api/current.ts — GET /api/current
import { readClaudeConfig } from "../core/claude-config";
import { rollCompanion } from "../core/buddy";

export async function handleCurrent(req: Request): Promise<Response> {
  const config = readClaudeConfig();
  if (!config?.userID) {
    return Response.json({ error: "No userID found" }, { status: 404 });
  }
  const companion = rollCompanion(config.userID);
  return Response.json({ companion, userID: config.userID });
}
