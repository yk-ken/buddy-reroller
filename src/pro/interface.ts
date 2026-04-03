// src/pro/interface.ts — Pro 模块公共接口（开源可见）
import type { Companion } from "../types";

export interface ProModule {
  /** Pro 专属：满属性传奇宠物过滤 */
  isPerfectLegendary(companion: Companion, peakStat?: string, dumpStat?: string): boolean;
  /** 当前构建是否包含 Pro 功能 */
  hasProBuild(): boolean;
}
