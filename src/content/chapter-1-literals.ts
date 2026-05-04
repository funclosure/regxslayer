import type { Chapter } from "@/game/types";

export const chapter: Chapter = {
  id: "literals-anchors",
  title: "Literals & Anchors",
  intro: "First steps: match exact text, use ^ and $ to pin where you mean.",
  cheatsheet: [
    "abc       matches the literal text 'abc'",
    "^abc      matches 'abc' only at line start",
    "abc$      matches 'abc' only at line end",
    "^abc$     matches lines that are exactly 'abc'",
    "a|b       matches 'a' or 'b'",
    "(...)     groups; useful with |",
  ],
  monsters: [
    {
      id: "scribblet",
      name: "Scribblet the Inkblot",
      portrait: "scribblet",
      flavor: "A soft, smudgy thing. Good for warming up.",
      layers: [
        {
          topic: "literal text",
          lines: [
            { text: "hello",        vital: true  },
            { text: "world",        vital: true  },
            { text: "hello world",  vital: false },
            { text: "say hello",    vital: false },
          ],
        },
        {
          topic: "anchors",
          lines: [
            { text: "alpha",     vital: true  },
            { text: "beta",      vital: true  },
            { text: "alphabet",  vital: false },
            { text: "betamax",   vital: false },
          ],
        },
      ],
      heart: { text: "INK_HEART_42" },
    },
  ],
};
