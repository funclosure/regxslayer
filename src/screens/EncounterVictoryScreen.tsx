import React, { useEffect } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";

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
    <box flexDirection="column" padding={2} gap={1} alignItems="center">
      <text>SLAIN</text>
      <text>{monsterName}</text>
      <text>───────────────</text>
      <text>Encounter #{sessionNumber} · kill {killNumberInSession} of this session</text>
      <text> </text>
      <text>any key advances · [esc] main menu</text>
    </box>
  );
}
