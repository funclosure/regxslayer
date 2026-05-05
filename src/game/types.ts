// src/game/types.ts
import type { Trait } from "./traits";

export type Line = {
  text: string;
  vital: boolean;
};

export type Layer = {
  topic: string;
  traits: Trait[];        // v2: non-empty, subset of the parent monster's traits
  lines: Line[];
  coaching?: string;      // v2: only used by tutorial mode
};

export type MonsterPool = "story" | "wild" | "tutorial";

export type Monster = {
  id: string;
  name: string;
  portrait: string;
  flavor: string;
  pool: MonsterPool;       // v2: drives mode selection
  traits: Trait[];         // v2: non-empty, union over layers (+ heart traits if any)
  layers: Layer[];
  heart: { text: string };
  coaching?: string;       // v2: shown during INTRO phase, tutorial mode only
};

export type Chapter = {
  id: string;
  title: string;
  intro: string;
  cheatsheet: string[];
  monsters: Monster[];
};

export type EvalResult = {
  vitalsHit: number;
  vitalsTotal: number;
  collateral: number;
  perfect: boolean;
  invalid?: string;
  /** Per-line match map, keyed by `${layerIdx}:${lineIdx}` for the body view. Heart entries use `heart`. */
  matchedLineKeys: ReadonlySet<string>;
};

export type CombatPhase =
  | { kind: "intro" }
  | { kind: "layerActive"; layerIdx: number }
  | { kind: "strip"; layerIdx: number }
  | { kind: "heart" }
  | { kind: "kill" };

export type BestRegex = {
  pattern: string;
  length: number;
};

export type MonsterRecord = {
  slainAt: string;
  bestRegexes: Record<string, BestRegex>;
};

// v2: trait-stat shape — see spec §3.5
export type TraitStat = {
  /** # of layers cleanly stripped while exercising this trait. */
  perfectStrips: number;
  /** # of distinct non-perfect patterns submitted on layers tagged with this trait,
   *  deduped per (trait, layer-life). */
  nonPerfectTries: number;
};

export type SaveMode = "story" | "encounter" | "tutorial";

export type SaveFile = {
  version: 2;
  createdAt: string;
  updatedAt: string;
  chapters: Record<string, { monsters: Record<string, MonsterRecord> }>;
  // v2 fields
  traitStats: Record<string, TraitStat>;   // keyed by Trait literal
  encounterSessions: number;
  encounterKills: number;
  storyKills: number;
  lastMode: SaveMode | null;
};
