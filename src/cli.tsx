#!/usr/bin/env bun
import React from "react";
import { createCliRenderer, createRoot } from "@gridland/bun";
import { useTerminalDimensions } from "@gridland/utils";
import { App } from "./app";

const MIN_COLS = 80;
const MIN_ROWS = 24;

function Root(): React.ReactElement {
  const { width, height } = useTerminalDimensions();
  if (width < MIN_COLS || height < MIN_ROWS) {
    return (
      <box flexDirection="column" padding={2} alignItems="center" justifyContent="center">
        <text>regxslayer needs at least {MIN_COLS}×{MIN_ROWS}.</text>
        <text>Currently {width}×{height} — please resize your terminal.</text>
      </box>
    );
  }
  return <App />;
}

async function main(): Promise<void> {
  process.env["REGXSLAYER_NO_COLOR"] = process.env["NO_COLOR"] ? "1" : "";

  const renderer = await createCliRenderer({ exitOnCtrlC: true });

  const cleanup = (): void => {
    try { renderer.destroy(); } catch { /* ignore */ }
  };
  process.on("SIGINT", () => { cleanup(); process.exit(130); });
  process.on("SIGTERM", () => { cleanup(); process.exit(143); });

  const root = createRoot(renderer);
  root.render(<Root />);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
