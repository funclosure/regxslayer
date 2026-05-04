import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      box: any;
      text: any;
    }
  }
}

declare module "@gridland/bun" {
  export function createRoot(renderer: unknown): {
    render: (element: React.ReactElement) => void;
    unmount?: () => void;
  };
}
