import React from "react";
import type { SaveFile } from "@/game/types";

const SaveContext = React.createContext<SaveFile | null>(null);

/**
 * Pure derivation of the lifetime numbers shown in the status bar.
 * Exported separately so tests can exercise it without a React tree.
 */
export function computeLifetime(save: SaveFile): { slain: number; sessions: number } {
  return {
    slain: save.storyKills + save.encounterKills,
    sessions: save.encounterSessions,
  };
}

export type SaveProviderProps = {
  save: SaveFile;
  children: React.ReactNode;
};

export function SaveProvider({ save, children }: SaveProviderProps): React.ReactElement {
  return <SaveContext.Provider value={save}>{children}</SaveContext.Provider>;
}

/**
 * Returns the lifetime numbers from the nearest `<SaveProvider>`. Throws
 * if no provider is mounted — the Shell relies on this and should never
 * render outside the app provider tree.
 */
export function useSaveLifetime(): { slain: number; sessions: number } {
  const save = React.useContext(SaveContext);
  if (save === null) {
    throw new Error("useSaveLifetime must be called inside <SaveProvider>");
  }
  return computeLifetime(save);
}
