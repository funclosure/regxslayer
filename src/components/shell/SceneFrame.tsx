import React from "react";

/** Default inner column width for scene content, in characters. */
export const DEFAULT_SCENE_WIDTH = 64;

export type SceneFrameProps = {
  children: React.ReactNode;
  /** Inner column width. Default DEFAULT_SCENE_WIDTH. */
  width?: number;
};

/** Centered, fixed-width column wrapped in a scrollbox. Use for scene content
 *  that's just stacked text rows (selects, stats, victories). MenuScreen and
 *  CombatScreen lay out their scene directly without this wrapper. */
export function SceneFrame({ children, width = DEFAULT_SCENE_WIDTH }: SceneFrameProps): React.ReactElement {
  return (
    <scrollbox flexGrow={1}>
      <box flexDirection="column" alignItems="center">
        <box flexDirection="column" width={width}>
          {children}
        </box>
      </box>
    </scrollbox>
  );
}
