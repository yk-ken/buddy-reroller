// src/api/detect.ts — GET /api/detect 环境检测
import { readClaudeConfig, getClaudeConfigPath } from "../core/claude-config";
import { rollCompanion } from "../core/buddy";
import { getProModule, isProUnlocked } from "../pro";
import type { EnvInfo } from "../types";

export async function handleDetect(req: Request): Promise<Response> {
  const configPath = getClaudeConfigPath();
  const config = readClaudeConfig(configPath);
  const hasAccountUuid = !!config?.accountUuid;
  const currentUserID = config?.userID ?? null;
  let currentCompanion = null;
  if (currentUserID) {
    currentCompanion = rollCompanion(currentUserID);
  }
  const env: EnvInfo = {
    configPath,
    hasAccountUuid,
    currentUserID,
    currentCompanion,
    isPro: isProUnlocked(),
    isSupported: !hasAccountUuid,
  };
  return Response.json(env);
}
