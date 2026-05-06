import React, { useEffect } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Screen } from "@/components/Screen";

export type EncounterVictoryProps = {
  monsterName: string;
  sessionNumber: number;       // save.encounterSessions
  killNumberInSession: number; // 1-based count of kills since the player entered this session
  onAdvance: () => void;
  onBack: () => void;
  /** Auto-advance after this many ms unless the user presses a key. Tests pass 1. */
  autoAdvanceMs?: number;
};

export function EncounterVictoryScreen(props: EncounterVictoryProps): React.ReactElement {
  const { monsterName, sessionNumber, killNumberInSession, onAdvance, onBack, autoAdvanceMs = 1500 } = props;

  useKeyboard((e: KeyEvent) => {
    if (e.name === "escape") onBack();
    else onAdvance();
  }, { global: true });

  useEffect(() => {
    const handle = setTimeout(onAdvance, autoAdvanceMs);
    return () => clearTimeout(handle);
  }, [autoAdvanceMs, onAdvance]);

  return (
    <Screen hints="any key advances · [esc] menu">
      <box flexDirection="column" gap={0}>
        <text>SLAIN</text>
        <text>───────────────</text>
      </box>
      <text>{monsterName}</text>
      <text>Encounter #{sessionNumber} · kill {killNumberInSession} of this session</text>
      <box flexGrow={1} />
      <text>any key advances · [esc] main menu</text>
    </Screen>
  );
}
