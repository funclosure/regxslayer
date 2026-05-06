/**
 * Augmentation shims for @gridland/bun v0.4.3.
 *
 * WHY THIS FILE EXISTS: The published dist/index.d.ts for @gridland/bun does not declare
 * `createRoot` (it is only referenced in a comment) and does not augment React's
 * JSX.IntrinsicElements with the `box` / `text` runtime tags. Without these declarations,
 * `tsc --noEmit` fails with "Property does not exist" and "Module has no exported member" errors.
 *
 * WHY box / text ARE TYPED AS any: Deliberate shortcut for v1 to move quickly. If typo bugs
 * in component prop names become a problem, tighten these to real prop shapes.
 *
 * REVISIT ON UPGRADE: When bumping @gridland/bun, check whether the upstream .d.ts now
 * includes these declarations. If it does, delete this file entirely.
 */
import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      box: any;
      text: any;
      span: any;
      scrollbox: any;
    }
  }
}

declare module "@gridland/bun" {
  export function createRoot(renderer: unknown): {
    render: (element: React.ReactElement) => void;
    unmount?: () => void;
  };
}
