// src/api/apply.ts — POST /api/apply
import { applyUserID, backupConfig, getClaudeConfigPath } from "../core/claude-config";

export async function handleApply(req: Request): Promise<Response> {
  const { userID } = await req.json();
  if (!userID || typeof userID !== "string") {
    return Response.json({ error: "userID required" }, { status: 400 });
  }
  const configPath = getClaudeConfigPath();
  backupConfig(configPath);
  const success = applyUserID(userID, configPath);
  if (success) {
    return Response.json({ success: true, message: "Applied! Restart Claude Code and run /buddy" });
  }
  return Response.json({ error: "Failed to apply" }, { status: 500 });
}
