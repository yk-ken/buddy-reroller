// src/core/machine-id.ts — 机器指纹，用于加密密钥派生
import { hostname } from "os";
import { execSync } from "child_process";

let _cached: string | null = null;

export function getMachineId(): string {
  if (_cached) return _cached;

  const parts: string[] = [hostname()];

  try {
    // Windows
    if (process.platform === "win32") {
      const sid = execSync(
        `wmic csproduct get UUID /value 2>nul || echo NONE`,
        { encoding: "utf-8", timeout: 3000 }
      ).trim();
      parts.push(sid);
    } else {
      // macOS / Linux
      const id = execSync(
        `cat /etc/machine-id 2>/dev/null || ioreg -rd1 -c IOPlatformExpertDevice 2>/dev/null | awk '/IOPlatformUUID/{print $3}' || echo NONE`,
        { encoding: "utf-8", timeout: 3000 }
      ).trim();
      parts.push(id);
    }
  } catch {
    parts.push("fallback");
  }

  parts.push(process.env.USERNAME ?? process.env.USER ?? "unknown");

  const raw = parts.join("|");
  // 使用 Bun.hash 生成确定性指纹
  const hash = Bun.hash(raw);
  _cached = hash.toString(16).padStart(16, "0");
  return _cached;
}
