import type { Chapter, Monster } from "@/game/types";
import { chapter as chapter1 } from "./chapter-1-literals";
import { chapter as chapter2 } from "./chapter-2-charclasses";
import { chapter as chapter3 } from "./chapter-3-quantifiers";
import { tutorialMonsters } from "./tutorial";
import { wildMonsters } from "./wild";

export const storyChapters: Chapter[] = [chapter1, chapter2, chapter3];
export { tutorialMonsters, wildMonsters };

export const allMonsters: Monster[] = [
  ...storyChapters.flatMap((c) => c.monsters),
  ...tutorialMonsters,
  ...wildMonsters,
];
