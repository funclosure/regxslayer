import React from "react";

/** Default inner column width for screens, in characters. */
export const DEFAULT_SCREEN_WIDTH = 64;

/**
 * Pure prop builder for the outer box of `Screen`. Extracted so the
 * conditional-prop logic can be unit-tested without rendering.
 */
export function screenOuterBoxProps(centerVertically: boolean) {
  const base = {
    flexDirection: "column" as const,
    flexGrow: 1,
    padding: 2,
    alignItems: "center" as const,
  };
  return centerVertically
    ? { ...base, justifyContent: "center" as const }
    : base;
}

export type ScreenProps = {
  children: React.ReactNode;
  /** Inner column width in characters. Default `DEFAULT_SCREEN_WIDTH` (64). */
  width?: number;
  /** Centers content vertically as well as horizontally. Default false. */
  centerVertically?: boolean;
};

export function Screen({
  children,
  width = DEFAULT_SCREEN_WIDTH,
  centerVertically = false,
}: ScreenProps): React.ReactElement {
  return (
    <box {...screenOuterBoxProps(centerVertically)}>
      <box flexDirection="column" width={width}>
        {children}
      </box>
    </box>
  );
}
