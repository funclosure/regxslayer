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
      pool: "story",
      flavor: "Type a regex below. Press [?] for help, [esc] to flee. Keys are live — every keystroke counts.",
      traits: ["LITERAL", "ANCHOR_START", "ANCHOR_END"],
      layers: [
        {
          topic: "exact words",
          traits: ["LITERAL", "ANCHOR_START", "ANCHOR_END"],
          lines: [
            { text: "hello",        vital: true  },
            { text: "world",        vital: true  },
            { text: "hello world",  vital: false },
            { text: "say hello",    vital: false },
            { text: "helloworld",   vital: false },
          ],
        },
      ],
      heart: { text: "INK_HEART_42" },
    },
    {
      id: "caretling",
      name: "Caretling",
      portrait: "caretling",
      pool: "story",
      flavor: "Loves pretending it owns the start of every line.",
      traits: ["LITERAL", "ANCHOR_START", "ANCHOR_END"],
      layers: [
        {
          topic: "anchored start",
          traits: ["ANCHOR_START", "LITERAL"],
          lines: [
            { text: "alpha",       vital: true  },
            { text: "betaalpha",   vital: false },
            { text: "Italphabet",  vital: false },
            { text: "alpine",      vital: true  },
          ],
        },
        {
          topic: "anchored end",
          traits: ["ANCHOR_END", "LITERAL"],
          lines: [
            { text: "running",     vital: true  },
            { text: "swimming",    vital: true  },
            { text: "ringtone",    vital: false },
            { text: "ingredient",  vital: false },
          ],
        },
      ],
      heart: { text: "ANCHOR_LORD_007" },
    },
    {
      id: "pinmeister",
      name: "Pinmeister",
      portrait: "pinmeister",
      pool: "story",
      flavor: "Demands you pin it exactly.",
      traits: ["LITERAL", "ANCHOR_START", "ANCHOR_END", "ALTERNATION"],
      layers: [
        {
          topic: "exact lines",
          traits: ["ANCHOR_START", "ANCHOR_END", "LITERAL", "ALTERNATION"],
          lines: [
            { text: "ok",          vital: true  },
            { text: "go",          vital: true  },
            { text: "okay",        vital: false },
            { text: "going",       vital: false },
            { text: "stop",        vital: false },
          ],
        },
        {
          topic: "exact lines harder",
          traits: ["ANCHOR_START", "ANCHOR_END", "LITERAL", "ALTERNATION"],
          lines: [
            { text: "north",       vital: true  },
            { text: "south",       vital: true  },
            { text: "northwest",   vital: false },
            { text: "southbound",  vital: false },
          ],
        },
      ],
      heart: { text: "PIN_OF_DOOM" },
    },
    {
      id: "alternaut",
      name: "Alternaut",
      portrait: "alternaut",
      pool: "story",
      flavor: "Splits in two — match either half cleanly.",
      traits: ["LITERAL", "ALTERNATION", "GROUP"],
      layers: [
        {
          topic: "alternation",
          traits: ["ALTERNATION", "LITERAL"],
          lines: [
            { text: "cat",         vital: true  },
            { text: "dog",         vital: true  },
            { text: "catalog",     vital: false },
            { text: "dogged",      vital: false },
            { text: "horse",       vital: false },
          ],
        },
        {
          topic: "grouped alternation",
          traits: ["ALTERNATION", "GROUP", "LITERAL"],
          lines: [
            { text: "v1",          vital: true  },
            { text: "v2",          vital: true  },
            { text: "v3",          vital: true  },
            { text: "v10",         vital: false },
            { text: "verse",       vital: false },
          ],
        },
      ],
      heart: { text: "ALT_FUSION_X" },
    },
  ],
};
