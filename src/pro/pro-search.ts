// src/pro/pro-search.ts — Pro search module loader (open source)
import type { Companion } from "../types";

interface ProSearchModule {
  filterProStats(companion: Companion, peakStat?: string, dumpStat?: string): boolean;
  isBetterMatch(total: number, bestTotal: number): boolean;
  selectBestCandidate(candidates: Array<{ seed: number; companion: Companion; total: number }>): typeof candidates[0];
}

let _module: ProSearchModule | null = null;

function load(): ProSearchModule {
  if (!_module) {
    try {
      _module = require("./pro-search-impl");
    } catch {
      _module = require("./pro-search-noop");
    }
  }
  return _module!;
}

export function filterProStats(companion: Companion, peakStat?: string, dumpStat?: string): boolean {
  return load().filterProStats(companion, peakStat, dumpStat);
}

export function isBetterMatch(total: number, bestTotal: number): boolean {
  return load().isBetterMatch(total, bestTotal);
}

export function selectBestCandidate(candidates: Array<{ seed: number; companion: Companion; total: number }>) {
  return load().selectBestCandidate(candidates);
}
