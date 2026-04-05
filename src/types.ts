// src/types.ts

export const SPECIES = [
  "duck","goose","blob","cat","dragon","octopus","owl","penguin",
  "turtle","snail","ghost","axolotl","capybara","cactus","robot",
  "rabbit","mushroom","chonk",
] as const;
export type Species = typeof SPECIES[number];

export const RARITIES = ["common","uncommon","rare","epic","legendary"] as const;
export type Rarity = typeof RARITIES[number];

export const EYES = ["·","✦","×","◉","@","°"] as const;
export type Eye = typeof EYES[number];

export const HATS = ["none","crown","tophat","propeller","halo","wizard","beanie","tinyduck"] as const;
export type Hat = typeof HATS[number];

export const STAT_NAMES = ["DEBUGGING","PATIENCE","CHAOS","WISDOM","SNARK"] as const;
export type StatName = typeof STAT_NAMES[number];

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1,
};

export const RARITY_FLOOR: Record<Rarity, number> = {
  common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 50,
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "#6b7280", uncommon: "#22c55e", rare: "#3b82f6",
  epic: "#a855f7", legendary: "#f59e0b",
};

export const SALT = "friend-2026-401";

export type Stats = Record<StatName, number>;

export interface Companion {
  rarity: Rarity;
  species: Species;
  eye: Eye;
  hat: Hat;
  shiny: boolean;
  stats: Stats;
  peakStat: StatName;
  dumpStat: StatName;
}

export interface SearchCriteria {
  species?: Species;
  rarity?: Rarity;
  eye?: Eye;
  hat?: Hat;
  shiny?: boolean;
  peakStat?: StatName;
  dumpStat?: StatName;
}

export interface CollectionEntry {
  id: string;
  userID: string;
  species: Species;
  rarity: Rarity;
  shiny: boolean;
  eye: Eye;
  hat: Hat;
  stats: Stats;
  peakStat: StatName;
  dumpStat: StatName;
  foundAt: string;
  searchAttempts: number;
  applied: boolean;
  tags: string[];
}

export interface EnvInfo {
  configPath: string;
  hasAccountUuid: boolean;
  currentUserID: string | null;
  currentCompanion: Companion | null;
  isPro: boolean;
  isSupported: boolean;
}
