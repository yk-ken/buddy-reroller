// src/core/database.ts — Pre-computed optimal companions database
// Embedded in exe via JSON import. Queried before real-time search.
import type { SearchCriteria, Companion } from "../types";

// Database entry: pre-computed optimal result for a specific criteria combination
interface DbEntry {
  userID: string;
  species: string;
  rarity: string;
  eye: string;
  hat: string;
  shiny: boolean;
  stats: Record<string, number>;
  peakStat: string;
  dumpStat: string;
  totalStats: number;
}

type DbData = Record<string, DbEntry>;

// Lazy-loaded database (embedded at compile time)
let _db: DbData | null = null;

function loadDb(): DbData {
  if (_db) return _db;
  try {
    _db = require("../../data/optimal-db.json") as DbData;
    // Filter out non-entry keys (like _comment, _format, _version)
    const entries: DbData = {};
    for (const [key, val] of Object.entries(_db)) {
      if (!key.startsWith("_")) {
        entries[key] = val;
      }
    }
    _db = entries;
    return _db;
  } catch {
    _db = {};
    return _db;
  }
}

/**
 * Serialize search criteria to a deterministic key.
 * Format: species|rarity|eye|hat|shiny|peakStat|dumpStat
 * Empty string for "any"/undefined values.
 */
export function criteriaKey(criteria: SearchCriteria): string {
  return [
    criteria.species ?? "",
    criteria.rarity ?? "",
    criteria.eye ?? "",
    criteria.hat ?? "",
    criteria.shiny === undefined ? "" : criteria.shiny ? "yes" : "no",
    criteria.peakStat ?? "",
    criteria.dumpStat ?? "",
  ].join("|");
}

/**
 * Look up pre-computed optimal companion for given criteria.
 * Returns null if not found in database.
 */
export function lookupDatabase(criteria: SearchCriteria): (DbEntry & { companion: Companion }) | null {
  const db = loadDb();
  const key = criteriaKey(criteria);
  const entry = db[key];
  if (!entry) return null;

  // Reconstruct Companion from entry
  const companion: Companion = {
    rarity: entry.rarity as Companion["rarity"],
    species: entry.species as Companion["species"],
    eye: entry.eye as Companion["eye"],
    hat: entry.hat as Companion["hat"],
    shiny: entry.shiny,
    stats: entry.stats as Companion["stats"],
    peakStat: entry.peakStat as Companion["peakStat"],
    dumpStat: entry.dumpStat as Companion["dumpStat"],
  };

  return { ...entry, companion };
}

/**
 * Handle database lookup API request.
 */
export async function handleDatabaseLookup(req: Request): Promise<Response> {
  const { criteria } = await req.json() as { criteria: SearchCriteria };
  if (!criteria) {
    return Response.json({ found: false });
  }

  const result = lookupDatabase(criteria);
  if (!result) {
    return Response.json({ found: false });
  }

  return Response.json({
    found: true,
    userID: result.userID,
    companion: result.companion,
    totalStats: result.totalStats,
    source: "database",
  });
}
