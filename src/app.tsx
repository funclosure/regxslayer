import React, { useState } from "react";
import {
  storyChapters,
  tutorialMonsters,
  wildMonsters,
  allMonsters,
} from "@/content";
import { StorySelectScreen } from "@/screens/StorySelectScreen";
import { CombatScreen } from "@/screens/CombatScreen";
import { MenuScreen, type MenuChoice } from "@/screens/MenuScreen";
import { VictoryScreen } from "@/screens/VictoryScreen";
import { EncounterIntroScreen } from "@/screens/EncounterIntroScreen";
import { EncounterVictoryScreen } from "@/screens/EncounterVictoryScreen";
import { TutorialSelectScreen } from "@/screens/TutorialSelectScreen";
import { StatsScreen } from "@/screens/StatsScreen";
import { SaveProvider } from "@/components/SaveContext";
import { AppNoticeProvider } from "@/components/shell/AppNotice";
import {
  loadSave,
  recordKill,
  recordTraitAttempt,
  resetStats,
  setLastMode,
  incrementEncounterSessions,
} from "@/game/progress";
import { pickNext } from "@/game/encounter";
import type { Chapter, Monster, SaveFile, SaveMode } from "@/game/types";
import type { TraitEvent } from "@/components/hooks/useCombatEngine";

type Route =
  | { kind: "menu" }
  | { kind: "story-select" }
  | { kind: "encounter-intro" }
  | { kind: "encounter-fight"; monsterId: string; killsThisSession: number }
  | { kind: "encounter-victory"; monsterId: string; killsThisSession: number }
  | { kind: "tutorial-select" }
  | { kind: "stats" }
  | { kind: "combat"; chapterId: string; monsterId: string; mode: "story" | "tutorial" }
  | { kind: "victory"; chapterId: string; monsterId: string; mode: "story" | "tutorial" };

const ENCOUNTER_POOL: Monster[] = allMonsters.filter((m) => m.pool === "story" || m.pool === "wild");
const WILD_CHAPTER_ID = "__wild__";
const TUTORIAL_CHAPTER_ID = "__tutorial__";

const ENCOUNTER_CHAPTER: Chapter = {
  id: "__encounter__",
  title: "Wild Encounter",
  intro: "",
  cheatsheet: [
    "abc / ^abc / abc$       literals + anchors",
    "a|b / (a|b)             alternation + groups",
    "\\d \\w \\s              char classes",
    "[abc] [^abc] [a-z]      sets and ranges",
    "x* x+ x? x{n} x{n,m}    quantifiers",
    "\\. \\( \\$              escaping",
  ],
  monsters: [],
};

const TUTORIAL_CHAPTER: Chapter = {
  id: TUTORIAL_CHAPTER_ID,
  title: "Tutorial",
  intro: "",
  cheatsheet: [
    "abc       literal text",
    "^abc abc$ anchored",
    "\\d \\w \\s char classes",
    "x* x+ x?  quantifiers",
  ],
  monsters: [],
};

function findStoryMonster(chapterId: string, monsterId: string): { chapter: Chapter; monster: Monster } | null {
  const chapter = storyChapters.find((c) => c.id === chapterId);
  if (!chapter) return null;
  const monster = chapter.monsters.find((m) => m.id === monsterId);
  if (!monster) return null;
  return { chapter, monster };
}

function findTutorialMonster(monsterId: string): Monster | null {
  return tutorialMonsters.find((m) => m.id === monsterId) ?? null;
}

function findEncounterMonster(monsterId: string): Monster | null {
  return ENCOUNTER_POOL.find((m) => m.id === monsterId) ?? null;
}

function chapterIdForKill(monster: Monster, fallback: string): string {
  // Story monsters in encounter mode keep their authored chapter id (so kills aggregate).
  // Wild monsters in encounter mode use the synthetic wild chapter id.
  if (monster.pool === "story") {
    for (const c of storyChapters) {
      if (c.monsters.some((m) => m.id === monster.id)) return c.id;
    }
  }
  return fallback;
}

export function App(): React.ReactElement {
  const [save, setSave] = useState<SaveFile>(() => loadSave());
  const [route, setRoute] = useState<Route>({ kind: "menu" });
  const [progressUnwritable, setProgressUnwritable] = useState(false);

  const updatePersisted = (persisted: boolean): void => {
    if (!persisted) setProgressUnwritable(true);
  };

  const handleMenuSelect = (c: MenuChoice): void => {
    if (c === "quit") { process.exit(0); }
    if (c === "stats") { setRoute({ kind: "stats" }); return; }
    if (c === "story" || c === "continue" && save.lastMode === "story") {
      const r = setLastMode(save, "story");
      setSave(r.save); updatePersisted(r.persisted);
      setRoute({ kind: "story-select" }); return;
    }
    if (c === "encounter" || c === "continue" && save.lastMode === "encounter") {
      setRoute({ kind: "encounter-intro" }); return;
    }
    if (c === "tutorial" || c === "continue" && save.lastMode === "tutorial") {
      const r = setLastMode(save, "tutorial");
      setSave(r.save); updatePersisted(r.persisted);
      setRoute({ kind: "tutorial-select" }); return;
    }
  };

  const buildTraitEventHandler = (mode: SaveMode | null): ((e: TraitEvent) => void) | undefined => {
    if (mode !== "story" && mode !== "encounter") return undefined; // tutorial excluded
    return (e: TraitEvent): void => {
      if (e.kind === "perfect-strip" || e.kind === "non-perfect-try") {
        const r = recordTraitAttempt(save, { kind: e.kind, traits: e.traits });
        setSave(r.save); updatePersisted(r.persisted);
      }
    };
  };

  // ----- screen branches -----

  let routeJsx: React.ReactElement;
  if (route.kind === "menu") {
    routeJsx = <MenuScreen save={save} onSelect={handleMenuSelect} />;
  } else if (route.kind === "stats") {
    routeJsx = (
      <StatsScreen
        save={save}
        onReset={() => {
          const r = resetStats(save);
          setSave(r.save); updatePersisted(r.persisted);
        }}
        onBack={() => setRoute({ kind: "menu" })}
      />
    );
  } else if (route.kind === "story-select") {
    routeJsx = (
      <StorySelectScreen
        chapters={storyChapters}
        save={save}
        onPickMonster={(chapterId, monsterId) =>
          setRoute({ kind: "combat", chapterId, monsterId, mode: "story" })
        }
        onBack={() => setRoute({ kind: "menu" })}
      />
    );
  } else if (route.kind === "tutorial-select") {
    routeJsx = (
      <TutorialSelectScreen
        monsters={tutorialMonsters}
        onPick={(monsterId) =>
          setRoute({ kind: "combat", chapterId: TUTORIAL_CHAPTER_ID, monsterId, mode: "tutorial" })
        }
        onBack={() => setRoute({ kind: "menu" })}
      />
    );
  } else if (route.kind === "encounter-intro") {
    routeJsx = (
      <EncounterIntroScreen
        onBegin={() => {
          const r1 = setLastMode(save, "encounter");
          const r2 = incrementEncounterSessions(r1.save);
          setSave(r2.save);
          updatePersisted(r1.persisted && r2.persisted);
          const m = pickNext(ENCOUNTER_POOL, null);
          setRoute({ kind: "encounter-fight", monsterId: m.id, killsThisSession: 0 });
        }}
        onBack={() => setRoute({ kind: "menu" })}
      />
    );
  } else if (route.kind === "encounter-fight") {
    const monster = findEncounterMonster(route.monsterId);
    if (!monster) return <text>Monster id "{route.monsterId}" not found — this is a bug. Press Ctrl-C to quit.</text>;
    const onTrait = buildTraitEventHandler("encounter");
    routeJsx = (
      <CombatScreen
        chapter={ENCOUNTER_CHAPTER}
        monster={monster}
        mode="encounter"
        onKill={(bestRegexes) => {
          const chapterId = chapterIdForKill(monster, WILD_CHAPTER_ID);
          const r = recordKill(save, {
            chapterId,
            monsterId: monster.id,
            bestRegexes,
            mode: "encounter",
          });
          setSave(r.save); updatePersisted(r.persisted);
          setRoute({
            kind: "encounter-victory",
            monsterId: monster.id,
            killsThisSession: route.killsThisSession + 1,
          });
        }}
        onFlee={() => setRoute({ kind: "menu" })}
        onTraitEvent={onTrait}
      />
    );
  } else if (route.kind === "encounter-victory") {
    const monster = findEncounterMonster(route.monsterId);
    if (!monster) return <text>Monster id "{route.monsterId}" not found — this is a bug. Press Ctrl-C to quit.</text>;
    routeJsx = (
      <EncounterVictoryScreen
        monsterName={monster.name}
        sessionNumber={save.encounterSessions}
        killNumberInSession={route.killsThisSession}
        onAdvance={() => {
          const next = pickNext(ENCOUNTER_POOL, route.monsterId);
          setRoute({
            kind: "encounter-fight",
            monsterId: next.id,
            killsThisSession: route.killsThisSession,
          });
        }}
        onBack={() => setRoute({ kind: "menu" })}
      />
    );
  } else if (route.kind === "combat") {
    if (route.mode === "tutorial") {
      const monster = findTutorialMonster(route.monsterId);
      if (!monster) return <text>Monster id "{route.monsterId}" not found — this is a bug. Press Ctrl-C to quit.</text>;
      routeJsx = (
        <CombatScreen
          chapter={TUTORIAL_CHAPTER}
          monster={monster}
          mode="tutorial"
          onKill={() => {
            // Tutorial kills are intentionally not persisted.
            setRoute({ kind: "tutorial-select" });
          }}
          onFlee={() => setRoute({ kind: "tutorial-select" })}
        />
      );
    } else {
      // story mode
      const found = findStoryMonster(route.chapterId, route.monsterId);
      if (!found) { setRoute({ kind: "menu" }); return <box />; }
      const { chapter, monster } = found;
      const onTrait = buildTraitEventHandler("story");
      routeJsx = (
        <CombatScreen
          chapter={chapter}
          monster={monster}
          mode="story"
          onKill={(bestRegexes) => {
            const r = recordKill(save, {
              chapterId: chapter.id,
              monsterId: monster.id,
              bestRegexes,
              mode: "story",
            });
            setSave(r.save); updatePersisted(r.persisted);
            setRoute({ kind: "victory", chapterId: chapter.id, monsterId: monster.id, mode: "story" });
          }}
          onFlee={() => setRoute({ kind: "story-select" })}
          onTraitEvent={onTrait}
        />
      );
    }
  } else {
    // route.kind === "victory"
    const monster =
      route.mode === "tutorial"
        ? findTutorialMonster(route.monsterId)
        : (findStoryMonster(route.chapterId, route.monsterId)?.monster ?? null);
    if (!monster) return <text>Monster id "{route.monsterId}" not found — this is a bug. Press Ctrl-C to quit.</text>;
    routeJsx = (
      <VictoryScreen
        monsterName={monster.name}
        onContinue={() =>
          setRoute(
            route.mode === "tutorial"
              ? { kind: "tutorial-select" }
              : { kind: "story-select" }
          )
        }
      />
    );
  }

  return (
    <SaveProvider save={save}>
      <AppNoticeProvider value={{ progressUnwritable }}>
        {routeJsx}
      </AppNoticeProvider>
    </SaveProvider>
  );
}
