import React, { useEffect } from "react";
import { useKeyboard, type KeyEvent } from "@gridland/utils";
import { Shell } from "@/components/shell/Shell";
import { SceneFrame } from "@/components/shell/SceneFrame";
import { Prompt } from "@/components/shell/panel/Prompt";

export type EncounterVictoryProps = {
  monsterName: string;
  sessionNumber: number;
  killNumberInSession: number;
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

  const scene = (
    <SceneFrame>
      <box flexDirection="column" gap={0}>
        <text>SLAIN</text>
        <text>─────</text>
      </box>
      <text> </text>
      <text>{monsterName}</text>
      <text>Encounter #{sessionNumber} · kill {killNumberInSession} of this session</text>
    </SceneFrame>
  );

  return (
    <Shell
      screen="victory"
      scene={scene}
      panel={<Prompt hint="any key advances · [esc] menu" />}
    />
  );
}
