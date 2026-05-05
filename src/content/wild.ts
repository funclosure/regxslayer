import type { Monster } from "@/game/types";

export const wildMonsters: Monster[] = [
  {
    id: "dotgrim",
    name: "Dotgrim",
    portrait: "dotgrim",
    pool: "wild",
    flavor: "Surrounded by punctuation. The dot is sacred and must be quoted.",
    traits: ["ESCAPE", "LITERAL", "QUANT_PLUS"],
    layers: [
      {
        topic: "literal dots",
        traits: ["ESCAPE", "LITERAL"],
        lines: [
          { text: "1.2.3",       vital: true  },
          { text: "v0.1.0",      vital: true  },
          { text: "abc",         vital: false },
          { text: "no dot here", vital: false },
        ],
      },
      {
        topic: "domains",
        traits: ["ESCAPE", "LITERAL", "QUANT_PLUS"],
        lines: [
          { text: "example.com",       vital: true  },
          { text: "regex.io",          vital: true  },
          { text: "no_domain",         vital: false },
          { text: "https://x.io/path", vital: false },
        ],
      },
    ],
    heart: { text: "DOT_HEART_2024" },
  },
];
