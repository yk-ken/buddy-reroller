// src/pro/noop.ts — 开源版 fallback（GitHub 可见）
import type { ProModule } from "./interface";
import type { Companion } from "../types";

export const proModule: ProModule = {
  isPerfectLegendary(_companion: Companion): boolean {
    return false; // 开源版永远不匹配 Pro 条件
  },
  hasProBuild(): boolean {
    return false;
  },
};
