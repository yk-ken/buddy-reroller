// src/api/search.ts — WebSocket /ws/search 搜索引擎
import type { ServerWebSocket } from "bun";
import { rollCompanion } from "../core/buddy";
import { getProModule } from "../pro";
import type { SearchCriteria, Companion } from "../types";

function matchesCriteria(companion: Companion, criteria: SearchCriteria): boolean {
  if (criteria.species && companion.species !== criteria.species) return false;
  if (criteria.rarity && companion.rarity !== criteria.rarity) return false;
  if (criteria.eye && companion.eye !== criteria.eye) return false;
  if (criteria.hat && companion.hat !== criteria.hat) return false;
  if (criteria.shiny !== undefined && companion.shiny !== criteria.shiny) return false;
  return true;
}

interface SearchWSData {
  criteria: SearchCriteria;
  proSearch: boolean;
  peakStat?: string;
  dumpStat?: string;
  running: boolean;
}

export const handleSearchWS = {
  open(ws: ServerWebSocket<SearchWSData>) {
    ws.data = { criteria: {}, proSearch: false, running: false };
  },
  message(ws: ServerWebSocket<SearchWSData>, message: string) {
    const data = JSON.parse(message);
    if (data.type === "start") {
      const pro = getProModule();
      const isProSearch = !!(data.peakStat || data.dumpStat);
      // Pro 搜索：需要 Pro 构建
      if (isProSearch && !pro.hasProBuild()) {
        ws.send(JSON.stringify({ type: "error", message: "Pro feature: requires Pro build" }));
        return;
      }
      ws.data.criteria = data.criteria || {};
      ws.data.proSearch = isProSearch;
      ws.data.peakStat = data.peakStat;
      ws.data.dumpStat = data.dumpStat;
      ws.data.running = true;
      runSearch(ws);
    }
    if (data.type === "stop") {
      ws.data.running = false;
    }
  },
  close(ws: ServerWebSocket<SearchWSData>) {
    ws.data.running = false;
  },
};

async function runSearch(ws: ServerWebSocket<SearchWSData>) {
  const { criteria, proSearch, peakStat, dumpStat } = ws.data;
  const pro = getProModule();
  const startTime = Date.now();
  let attempts = 0;
  const batchSize = 5000;

  while (ws.data.running) {
    for (let i = 0; i < batchSize; i++) {
      attempts++;
      const uid = crypto.randomUUID().replace(/-/g, "");
      const companion = rollCompanion(uid);

      if (!matchesCriteria(companion, criteria)) continue;

      // Pro 满属性检查
      if (proSearch && !pro.isPerfectLegendary(companion, peakStat, dumpStat)) continue;

      ws.data.running = false;
      ws.send(JSON.stringify({
        type: "found",
        userID: uid,
        companion,
        attempts,
        elapsed: Date.now() - startTime,
      }));
      return;
    }

    ws.send(JSON.stringify({ type: "progress", attempts, elapsed: Date.now() - startTime }));
    await new Promise(r => setTimeout(r, 0));
  }

  ws.send(JSON.stringify({ type: "stopped", attempts }));
}
