#!/usr/bin/env bun
import React from "react";
import { createCliRenderer, createRoot } from "@gridland/bun";
import { App } from "./app";

async function main(): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });
  const root = createRoot(renderer);
  root.render(<App />);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
