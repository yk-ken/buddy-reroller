// src/pro/pro-search-noop.ts — Open-source stub (no PRO logic)
import type { Companion } from "../types";

/** PRO not available — always reject */
export function filterProStats(_companion: Companion, _peakStat?: string, _dumpStat?: string): boolean {
  return false;
}

/** PRO not available — never better */
export function isBetterMatch(_total: number, _bestTotal: number): boolean {
  return false;
}

/** PRO not available — return first candidate */
export function selectBestCandidate(candidates: Array<{ seed: number; companion: Companion; total: number }>) {
  return candidates[0];
}
