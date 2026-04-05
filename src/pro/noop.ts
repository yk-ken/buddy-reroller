// src/pro/noop.ts — 开源版 fallback（GitHub 可见）
import type { ProModule } from "./interface";

export const proModule: ProModule = {
  hasProBuild(): boolean {
    return false;
  },
};
