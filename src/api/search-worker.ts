// src/api/search-worker.ts — Worker: Phase 1 seed scan + Phase 2 reverse userID lookup
// Supports two modes:
//   1. Web Worker (dev mode) — self.onmessage / self.postMessage
//   2. Standalone process (compiled exe) — reads config from env, outputs JSON to stdout
import { mulberry32, rollCompanionFromSeed } from "../core/buddy";
import { filterProStats, isBetterMatch } from "../pro/pro-search";
import type { Companion, SearchCriteria } from "../types";
import { SALT } from "../types";

interface WorkerStartMsg {
  type: "start";
  criteria?: SearchCriteria;
  proSearch?: boolean;
  peakStat?: string;
  dumpStat?: string;
  workerId?: number;
  numWorkers?: number;
}

interface ProgressMessage {
  type: "progress";
  workerId: number;
  attempts: number;
  elapsed: number;
}

interface CompleteMessage {
  type: "complete";
  workerId: number;
  bestSeed: number | null;
  bestCompanion: Companion | null;
  bestTotal: number;
  matchesFound: number;
  attempts: number;
  elapsed: number;
}

type WorkerOutMsg = ProgressMessage | CompleteMessage;

let running = false;
const BATCH_SIZE = 100000;

function totalStats(companion: Companion): number {
  let sum = 0;
  for (const stat of Object.values(companion.stats)) {
    sum += stat;
  }
  return sum;
}

function doSearch(config: WorkerStartMsg, send: (msg: WorkerOutMsg) => void) {
  if (running) return;
  running = true;

  const { criteria = {}, proSearch = false, peakStat, dumpStat, workerId = 0, numWorkers = 4, randomOffset = 0 } = config;
  const startTime = Date.now();
  let attempts = 0;
  let bestSeed: number | null = null;
  let bestCompanion: Companion | null = null;
  let bestTotal = -1;
  let matchesFound = 0;

  const rangeSize = Math.ceil(0x100000000 / numWorkers);
  // Non-Pro: apply random offset so each search explores a different region
  const startSeed = ((workerId * rangeSize) + randomOffset) >>> 0;

  // Scan rangeSize seeds starting from startSeed (wraps around 0xFFFFFFFF)
  for (let i = 0; i < rangeSize && running; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, rangeSize);

    for (let j = i; j < batchEnd && running; j++) {
      const s = (startSeed + j) >>> 0; // wraps around 0xFFFFFFFF
      attempts++;

      const rng = mulberry32(s >>> 0);
      const r = rng();
      if (r < 0.99) continue; // not legendary

      const companion = rollCompanionFromSeed(s >>> 0);

      if (criteria.species && companion.species !== criteria.species) continue;
      if (criteria.rarity && companion.rarity !== criteria.rarity) continue;
      if (criteria.eye && companion.eye !== criteria.eye) continue;
      if (criteria.hat && companion.hat !== criteria.hat) continue;
      if (criteria.shiny !== undefined && companion.shiny !== criteria.shiny) continue;

      if (proSearch && !filterProStats(companion, peakStat, dumpStat)) continue;

      matchesFound++;
      if (proSearch) {
        const total = totalStats(companion);
        if (isBetterMatch(total, bestTotal)) {
          bestTotal = total;
          bestSeed = s >>> 0;
          bestCompanion = companion;
        }
      } else {
        // Non-Pro: first match wins, stop immediately
        bestSeed = s >>> 0;
        bestCompanion = companion;
        bestTotal = totalStats(companion);
        running = false;
        break;
      }
    }

    if (!running) break;

    send({
      type: "progress",
      workerId,
      attempts,
      elapsed: Date.now() - startTime,
    });
  }

  running = false;
  send({
    type: "complete",
    workerId,
    bestSeed,
    bestCompanion,
    bestTotal,
    matchesFound,
    attempts,
    elapsed: Date.now() - startTime,
  });
}

// --- Phase 2: Reverse userID lookup ---
// Given a target seed, find a userID string such that hash(userID + SALT) == targetSeed

interface ReverseLookupConfig {
  type: "reverse-lookup";
  targetSeed: number;
  workerId: number;
  numWorkers: number;
}

type ReverseOutMsg =
  | { type: "reverse-progress"; workerId: number; attempts: number; elapsed: number }
  | { type: "reverse-found"; workerId: number; userId: string; attempts: number; elapsed: number }
  | { type: "reverse-not-found"; workerId: number; attempts: number; elapsed: number };

function doReverseLookup(config: ReverseLookupConfig, send: (msg: ReverseOutMsg) => void) {
  if (running) return;
  running = true;

  const { targetSeed, workerId = 0 } = config;
  const startTime = Date.now();
  let attempts = 0;
  const MAX = 2_000_000_000; // 2B per worker — enough for >99.9% hit rate
  const REVERSE_BATCH = 500_000; // Larger batch for less overhead

  // Each worker uses a distinct prefix character to avoid overlap
  const prefix = String.fromCharCode(97 + workerId); // 'a', 'b', 'c', 'd'

  for (let i = 0; i < MAX && running; i += REVERSE_BATCH) {
    const batchEnd = Math.min(i + REVERSE_BATCH, MAX);

    for (let j = i; j < batchEnd && running; j++) {
      attempts++;
      const uid = prefix + j;
      // Bun.hash returns BigInt — use & mask for uint32 truncation
      if (Number(Bun.hash(uid + SALT) & 0xffffffffn) === targetSeed) {
        send({ type: "reverse-found", workerId, userId: uid, attempts, elapsed: Date.now() - startTime });
        running = false;
        return;
      }
    }

    if (!running) break;

    send({ type: "reverse-progress", workerId, attempts, elapsed: Date.now() - startTime });
  }

  running = false;
  send({ type: "reverse-not-found", workerId, attempts, elapsed: Date.now() - startTime });
}

// --- Mode detection ---

// Check if running as standalone process (spawned by compiled exe)
const isStandalone = typeof process !== "undefined" && process.argv.includes("--search-worker");

if (isStandalone) {
  // Standalone mode: read config from env, output JSON lines to stdout
  const config = JSON.parse(process.env.SEARCH_WORKER_CONFIG || "{}");
  const send = (msg: WorkerOutMsg | ReverseOutMsg) => {
    process.stdout.write(JSON.stringify(msg) + "\n");
  };
  if (config.mode === "reverse-lookup") {
    doReverseLookup(config, send);
  } else {
    doSearch(config, send);
  }
  process.exit(0);
} else {
  // Web Worker mode: use postMessage
  self.onmessage = (e: MessageEvent) => {
    const data = e.data;
    if (data.type === "start") {
      if (data.mode === "reverse-lookup") {
        const send = (msg: ReverseOutMsg) => self.postMessage(msg);
        doReverseLookup(data as ReverseLookupConfig, send);
      } else {
        const send = (msg: WorkerOutMsg) => self.postMessage(msg);
        doSearch(data as WorkerStartMsg, send);
      }
    }
    if (data.type === "stop") {
      running = false;
    }
  };
}

export { doSearch, doReverseLookup };
