// src/core/buddy.ts — 核心算法：mulberry32 PRNG + Bun.hash
import {
  SPECIES, RARITIES, EYES, HATS, RARITY_WEIGHTS,
  STAT_NAMES, RARITY_FLOOR, SALT,
  type Companion, type Species, type Rarity, type StatName,
} from "../types";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str: string): number {
  const h = Bun.hash(str);
  return Number(BigInt.asUintN(32, BigInt(h)));
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function rollRarity(rng: () => number): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (const r of RARITIES) {
    roll -= RARITY_WEIGHTS[r];
    if (roll < 0) return r;
  }
  return "common";
}

function rollStats(rng: () => number, rarity: Rarity): { stats: Record<string, number>; peakStat: StatName; dumpStat: StatName } {
  const floor = RARITY_FLOOR[rarity];
  const peakStat = pick(rng, STAT_NAMES);
  let dumpStat = pick(rng, STAT_NAMES);
  while (dumpStat === peakStat) dumpStat = pick(rng, STAT_NAMES);

  const stats = {} as Record<string, number>;
  for (const name of STAT_NAMES) {
    if (name === peakStat) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
    } else if (name === dumpStat) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
    } else {
      stats[name] = floor + Math.floor(rng() * 40);
    }
  }
  return { stats, peakStat, dumpStat };
}

export function rollCompanion(userId: string): Companion {
  const seed = hashSeed(userId + SALT);
  const rng = mulberry32(seed);
  const rarity = rollRarity(rng);
  const species = pick(rng, SPECIES);
  const eye = pick(rng, EYES);
  const hat: string = rarity === "common" ? "none" : pick(rng, HATS);
  const shiny = rng() < 0.01;
  const { stats, peakStat, dumpStat } = rollStats(rng, rarity);

  return {
    rarity,
    species: species as Species,
    eye: eye as Companion["eye"],
    hat: hat as Companion["hat"],
    shiny,
    stats: stats as Companion["stats"],
    peakStat,
    dumpStat,
  };
}
