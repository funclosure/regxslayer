// src/game/types.ts

export type Line = {
  text: string;
  vital: boolean;
};

export type Layer = {
  topic: string;
  lines: Line[];
};

export type Monster = {
  id: string;
  name: string;
  portrait: string;          // key into src/content/portraits.ts
  flavor: string;
  layers: Layer[];           // peeled in order
  heart: { text: string };   // single vital string
};

export type Chapter = {
  id: string;
  title: string;
  intro: string;
  cheatsheet: string[];      // shown on `?`
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
  bestRegexes: Record<string, BestRegex>;  // keys: "0", "1", ..., "heart"
};

export type SaveFile = {
  version: 1;
  createdAt: string;
  updatedAt: string;
  chapters: Record<string, { monsters: Record<string, MonsterRecord> }>;
};
