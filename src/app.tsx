import React, { useState } from "react";
import { chapters as ALL_CHAPTERS } from "@/content/chapters";
import { ChapterSelectScreen } from "@/screens/ChapterSelectScreen";
import { CombatScreen } from "@/screens/CombatScreen";
import { MenuScreen, type MenuChoice } from "@/screens/MenuScreen";
import { VictoryScreen } from "@/screens/VictoryScreen";
import { loadSave, recordKill } from "@/game/progress";
import type { SaveFile } from "@/game/types";

type Route =
  | { kind: "menu" }
  | { kind: "select" }
  | { kind: "combat"; chapterId: string; monsterId: string }
  | { kind: "victory"; chapterId: string; monsterId: string };

export function App(): React.ReactElement {
  const [save, setSave] = useState<SaveFile>(() => loadSave());
  const [route, setRoute] = useState<Route>({ kind: "menu" });
  const [progressUnwritable, setProgressUnwritable] = useState(false);

  const findMonster = (chapterId: string, monsterId: string) => {
    const chapter = ALL_CHAPTERS.find((c) => c.id === chapterId)!;
    return { chapter, monster: chapter.monsters.find((m) => m.id === monsterId)! };
  };

  const screen: React.ReactElement = (() => {
    if (route.kind === "menu") {
      return (
        <MenuScreen
          onSelect={(c: MenuChoice) => {
            if (c === "quit") process.exit(0);
            setRoute({ kind: "select" });
          }}
        />
      );
    }
    if (route.kind === "select") {
      return (
        <ChapterSelectScreen
          chapters={ALL_CHAPTERS}
          save={save}
          onPickMonster={(chapterId, monsterId) => setRoute({ kind: "combat", chapterId, monsterId })}
          onBack={() => setRoute({ kind: "menu" })}
        />
      );
    }
    if (route.kind === "combat") {
      const { chapter, monster } = findMonster(route.chapterId, route.monsterId);
      return (
        <CombatScreen
          chapter={chapter}
          monster={monster}
          onKill={(bestRegexes) => {
            const result = recordKill(save, {
              chapterId: chapter.id,
              monsterId: monster.id,
              bestRegexes,
            });
            setSave(result.save);
            if (!result.persisted) setProgressUnwritable(true);
            setRoute({ kind: "victory", chapterId: chapter.id, monsterId: monster.id });
          }}
          onFlee={() => setRoute({ kind: "select" })}
        />
      );
    }
    const { monster } = findMonster(route.chapterId, route.monsterId);
    return (
      <VictoryScreen
        monsterName={monster.name}
        onContinue={() => setRoute({ kind: "select" })}
      />
    );
  })();

  return (
    <box flexDirection="column" flexGrow={1}>
      <box flexGrow={1}>{screen}</box>
      {progressUnwritable ? <text>⚠ progress not saved</text> : null}
    </box>
  );
}
