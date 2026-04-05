// src/api/search.ts — WebSocket search: two-phase approach
// Phase 1: Scan full 2^32 seed range, find best companion
// Phase 2: Reverse-lookup a userID that hashes to the best seed
import type { ServerWebSocket } from "bun";
import { join } from "path";
import { isProUnlocked } from "../pro";
import { selectBestCandidate } from "../pro/pro-search";
import type { SearchCriteria, Companion } from "../types";
import { SALT } from "../types";

interface SearchWSData {
  criteria: SearchCriteria;
  proSearch: boolean;
  peakStat?: string;
  dumpStat?: string;
  running: boolean;
  processes: SubProcess[];
  totalAttempts: number;
  progressInterval?: ReturnType<typeof setInterval>;
  phase: 1 | 2;
  phase1Result?: {
    seed: number;
    companion: Companion;
    total: number;
    candidatesFound: number;
    attempts: number;
    elapsed: number;
  };
}

type WorkerOutMsg =
  | { type: "progress"; workerId: number; attempts: number; elapsed: number }
  | { type: "complete"; workerId: number; bestSeed: number | null; bestCompanion: Companion | null; bestTotal: number; matchesFound: number; attempts: number; elapsed: number }
  | { type: "reverse-progress"; workerId: number; attempts: number; elapsed: number }
  | { type: "reverse-found"; workerId: number; userId: string; attempts: number; elapsed: number }
  | { type: "reverse-not-found"; workerId: number; attempts: number; elapsed: number };

const DEFAULT_NUM_WORKERS = 4;

// Detect compiled exe mode (Bun's virtual path for compiled executables)
const isCompiled = import.meta.url.includes("~BUN") || import.meta.url.endsWith(".exe");

interface SubProcess {
  proc: ReturnType<typeof Bun.spawn>;
  workerId: number;
}

export const handleSearchWS = {
  open(ws: ServerWebSocket<SearchWSData>) {
    ws.data = { criteria: {}, proSearch: false, running: false, processes: [], totalAttempts: 0, phase: 1 };
  },
  message(ws: ServerWebSocket<SearchWSData>, message: string) {
    const data = JSON.parse(message);
    if (data.type === "start") {
      const isProSearch = !!(data.peakStat || data.dumpStat);
      if (isProSearch && !isProUnlocked()) {
        ws.send(JSON.stringify({ type: "error", message: "Pro feature: activate license to unlock" }));
        return;
      }
      ws.data.criteria = data.criteria || {};
      ws.data.proSearch = isProSearch;
      ws.data.peakStat = data.peakStat;
      ws.data.dumpStat = data.dumpStat;
      ws.data.running = true;
      ws.data.processes = [];
      ws.data.totalAttempts = 0;
      ws.data.phase = 1;
      ws.data.phase1Result = undefined;
      runPhase1(ws, data.numWorkers || DEFAULT_NUM_WORKERS);
    }
    if (data.type === "stop") {
      stopSearch(ws);
    }
  },
  close(ws: ServerWebSocket<SearchWSData>) {
    stopSearch(ws);
  },
};

function stopSearch(ws: ServerWebSocket<SearchWSData>) {
  ws.data.running = false;
  if (ws.data.progressInterval !== undefined) {
    clearInterval(ws.data.progressInterval);
    ws.data.progressInterval = undefined;
  }
  for (const p of ws.data.processes) {
    try { p.proc.kill(); } catch {}
    try { process.kill(p.proc.pid); } catch {}
  }
  ws.data.processes = [];
  ws.send(JSON.stringify({ type: "stopped", attempts: ws.data.totalAttempts }));
}

function spawnWorker(workerConfig: Record<string, unknown>): ReturnType<typeof Bun.spawn> {
  if (isCompiled) {
    return Bun.spawn({
      cmd: [process.execPath, "--search-worker"],
      env: { ...process.env, SEARCH_WORKER_CONFIG: JSON.stringify(workerConfig) },
      stdout: "pipe",
      stdin: "ignore",
      stderr: "ignore",
    });
  } else {
    const workerPath = join(import.meta.dir, "search-worker.ts");
    return Bun.spawn({
      cmd: ["bun", "run", workerPath, "--search-worker"],
      env: { ...process.env, SEARCH_WORKER_CONFIG: JSON.stringify(workerConfig) },
      stdout: "pipe",
      stdin: "ignore",
      stderr: "ignore",
    });
  }
}

function readLines(proc: ReturnType<typeof Bun.spawn>, callback: (msg: WorkerOutMsg) => void) {
  const stdout = proc.stdout as ReadableStream<Uint8Array>;
  const reader = stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!;
        for (const line of lines) {
          if (line.trim()) {
            try { callback(JSON.parse(line)); } catch {}
          }
        }
      }
    } catch {}
  })();
}

// ─── Phase 1: Exhaustive seed scan ───

function runPhase1(ws: ServerWebSocket<SearchWSData>, numWorkers: number) {
  const { criteria, proSearch, peakStat, dumpStat } = ws.data;
  const startTime = Date.now();
  const workerAttempts = new Map<number, number>();
  let completedWorkers = 0;
  const workerBests: Array<{ seed: number; companion: Companion; total: number }> = [];

  // Non-Pro: random offset so repeated searches explore different seed regions
  const randomOffset = ws.data.proSearch ? 0 : Math.floor(Math.random() * 0x100000000);

  for (let i = 0; i < numWorkers; i++) {
    const workerConfig = { type: "start", criteria, proSearch, peakStat, dumpStat, workerId: i, numWorkers, randomOffset };
    const proc = spawnWorker(workerConfig);

    const onMessage = (msg: WorkerOutMsg) => {
      if (!ws.data.running) return;
      if (msg.type === "progress") {
        workerAttempts.set(msg.workerId, msg.attempts);
      } else if (msg.type === "complete") {
        completedWorkers++;
        workerAttempts.set(msg.workerId, msg.attempts);

        if (msg.bestCompanion && msg.bestSeed !== null) {
          workerBests.push({ seed: msg.bestSeed, companion: msg.bestCompanion, total: msg.bestTotal });
        }

        // Pro: wait for all workers; Non-Pro: first match wins
        const shouldFinish = ws.data.proSearch
          ? completedWorkers >= numWorkers
          : workerBests.length > 0;

        if (shouldFinish) {
          clearInterval(ws.data.progressInterval);
          ws.data.progressInterval = undefined;
          // Kill Phase 1 workers
          for (const p of ws.data.processes) {
            try { p.proc.kill(); } catch {}
            try { process.kill(p.proc.pid); } catch {}
          }
          ws.data.processes = [];

          const phase1Attempts = Array.from(workerAttempts.values()).reduce((a, b) => a + b, 0);
          const phase1Elapsed = Date.now() - startTime;

          if (workerBests.length === 0) {
            ws.data.running = false;
            ws.send(JSON.stringify({
              type: "not_found",
              attempts: phase1Attempts,
              elapsed: phase1Elapsed,
              message: "Scanned entire seed space (2^32) — no match found.",
            }));
          } else {
            const best = ws.data.proSearch
              ? selectBestCandidate(workerBests)
              : workerBests[0];
            ws.data.phase1Result = {
              seed: best.seed,
              companion: best.companion,
              total: best.total,
              candidatesFound: workerBests.length,
              attempts: phase1Attempts,
              elapsed: phase1Elapsed,
            };
            // Start Phase 2
            runPhase2(ws, best.seed, numWorkers);
          }
        }
      }
    };

    readLines(proc, onMessage);
    ws.data.processes.push({ proc, workerId: i });
    workerAttempts.set(i, 0);
  }

  // Progress report every 500ms
  ws.data.progressInterval = setInterval(() => {
    if (!ws.data.running) { clearInterval(ws.data.progressInterval); return; }
    const total = Array.from(workerAttempts.values()).reduce((a, b) => a + b, 0);
    ws.data.totalAttempts = total;
    const pct = ((total / 0x100000000) * 100).toFixed(2);
    ws.send(JSON.stringify({ type: "progress", phase: 1, attempts: total, elapsed: Date.now() - startTime, parallel: numWorkers, progressPct: pct }));
  }, 500);
}

// ─── Phase 2: Reverse userID lookup ───

const PHASE2_WORKERS = 4; // Keep at 4 to avoid CPU starvation of main process

function finishPhase2(ws: ServerWebSocket<SearchWSData>, userId: string | null, phase1: NonNullable<SearchWSData["phase1Result"]>, phase2AttemptsTotal: number, phase2Elapsed: number) {
  ws.data.running = false;
  if (ws.data.progressInterval !== undefined) {
    clearInterval(ws.data.progressInterval);
    ws.data.progressInterval = undefined;
  }
  for (const p of ws.data.processes) {
    try { p.proc.kill(); } catch {}
    try { process.kill(p.proc.pid); } catch {}
  }
  ws.data.processes = [];

  const totalAttempts = phase1.attempts + phase2AttemptsTotal;
  const totalElapsed = phase1.elapsed + phase2Elapsed;

  if (userId) {
    ws.send(JSON.stringify({
      type: "found",
      userID: userId,
      companion: phase1.companion,
      totalStats: phase1.total,
      candidatesFound: phase1.candidatesFound,
      attempts: totalAttempts,
      elapsed: totalElapsed,
    }));
  } else {
    // All reverse-lookup workers exhausted without finding a userID
    ws.send(JSON.stringify({
      type: "not_found",
      attempts: totalAttempts,
      elapsed: totalElapsed,
      message: "Found matching companion but could not resolve a valid userID. Please try searching again.",
    }));
  }
}

function runPhase2(ws: ServerWebSocket<SearchWSData>, targetSeed: number, _numWorkers: number) {
  ws.data.phase = 2;
  ws.data.running = true;
  ws.data.processes = [];
  const startTime = Date.now();
  const phase1 = ws.data.phase1Result!;
  const numWorkers = PHASE2_WORKERS;

  let foundUserId: string | null = null;
  let finished = false;
  let completedWorkers = 0;
  const phase2Attempts = new Map<number, number>();

  const getPhase2Total = () => Array.from(phase2Attempts.values()).reduce((a, b) => a + b, 0);

  // Notify client that Phase 2 started
  ws.send(JSON.stringify({
    type: "progress",
    phase: 2,
    attempts: phase1.attempts,
    elapsed: phase1.elapsed,
    parallel: numWorkers,
    progressPct: "—",
    message: "Resolving userID…",
  }));

  for (let i = 0; i < numWorkers; i++) {
    const workerConfig = {
      type: "start",
      mode: "reverse-lookup",
      targetSeed,
      workerId: i,
      numWorkers,
    };
    const proc = spawnWorker(workerConfig);

    const onMessage = (msg: WorkerOutMsg) => {
      if (finished) return;

      if (msg.type === "reverse-progress") {
        phase2Attempts.set(msg.workerId, msg.attempts);
      } else if (msg.type === "reverse-found") {
        if (finished) return;
        finished = true;
        foundUserId = msg.userId;
        phase2Attempts.set(msg.workerId, msg.attempts);
        finishPhase2(ws, msg.userId, phase1, getPhase2Total(), Date.now() - startTime);
      } else if (msg.type === "reverse-not-found") {
        completedWorkers++;
        phase2Attempts.set(msg.workerId, msg.attempts);
        if (completedWorkers >= numWorkers && !foundUserId && !finished) {
          finished = true;
          finishPhase2(ws, null, phase1, getPhase2Total(), Date.now() - startTime);
        }
      }
    };

    readLines(proc, onMessage);
    ws.data.processes.push({ proc, workerId: i });
  }

  // Phase 2 progress
  ws.data.progressInterval = setInterval(() => {
    if (!ws.data.running) { clearInterval(ws.data.progressInterval); return; }
    const p2Attempts = getPhase2Total();
    const totalAttempts = phase1.attempts + p2Attempts;
    const totalElapsed = phase1.elapsed + (Date.now() - startTime);
    ws.data.totalAttempts = totalAttempts;
    ws.send(JSON.stringify({
      type: "progress",
      phase: 2,
      attempts: totalAttempts,
      elapsed: totalElapsed,
      parallel: numWorkers,
      progressPct: "—",
      phase2Attempts: p2Attempts,
    }));
  }, 500);
}
