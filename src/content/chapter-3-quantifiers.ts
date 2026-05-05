import type { Chapter } from "@/game/types";

export const chapter: Chapter = {
  id: "quantifiers",
  title: "Quantifiers",
  intro: "How much, how many. *, +, ?, {n}, {n,m} — pick the right repeater.",
  cheatsheet: [
    "x*       zero or more x",
    "x+       one or more x",
    "x?       zero or one x",
    "x{n}     exactly n",
    "x{n,m}   between n and m",
    "x{n,}    at least n",
  ],
  monsters: [
    {
      id: "starfist",
      name: "Starfist",
      portrait: "starfist",
      pool: "story",
      flavor: "Hits with zero or more punches.",
      traits: ["QUANT_STAR", "LITERAL"],
      layers: [
        {
          topic: "zero-or-more",
          traits: ["QUANT_STAR", "LITERAL"],
          lines: [
            { text: "ab",          vital: true  },
            { text: "aab",         vital: true  },
            { text: "aaab",        vital: true  },
            { text: "abc",         vital: false },
            { text: "b",           vital: true  },
          ],
        },
      ],
      heart: { text: "STAR_GUTS_01" },
    },
    {
      id: "pluson",
      name: "Pluson",
      portrait: "pluson",
      pool: "story",
      flavor: "Demands at least one of you.",
      traits: ["QUANT_PLUS", "CHAR_CLASS_DIGIT", "LITERAL"],
      layers: [
        {
          topic: "one-or-more",
          traits: ["QUANT_PLUS", "CHAR_CLASS_DIGIT"],
          lines: [
            { text: "9",           vital: true  },
            { text: "42",          vital: true  },
            { text: "1234",        vital: true  },
            { text: "no digits",   vital: false },
            { text: "v3",          vital: false },
          ],
        },
        {
          topic: "longer runs",
          traits: ["QUANT_PLUS", "LITERAL"],
          lines: [
            { text: "aaaaa",       vital: true  },
            { text: "aaa",         vital: true  },
            { text: "ab",          vital: false },
            { text: "bbb",         vital: false },
          ],
        },
      ],
      heart: { text: "PLUS_CORE_55" },
    },
    {
      id: "questling",
      name: "Questling",
      portrait: "questling",
      pool: "story",
      flavor: "Optional, but oh so important.",
      traits: ["QUANT_OPTIONAL", "LITERAL", "GROUP"],
      layers: [
        {
          topic: "zero-or-one",
          traits: ["QUANT_OPTIONAL", "LITERAL"],
          lines: [
            { text: "color",       vital: true  },
            { text: "colour",      vital: true  },
            { text: "colors",      vital: false },
            { text: "colourful",   vital: false },
          ],
        },
        {
          topic: "optional groups",
          traits: ["QUANT_OPTIONAL", "GROUP", "LITERAL"],
          lines: [
            { text: "http",        vital: true  },
            { text: "https",       vital: true  },
            { text: "httpz",       vital: false },
            { text: "shttp",       vital: false },
          ],
        },
      ],
      heart: { text: "OPT_HEART_99" },
    },
    {
      id: "bracetron",
      name: "Bracetron",
      portrait: "bracetron",
      pool: "story",
      flavor: "Counts. Precisely. Don't be off by one.",
      traits: ["QUANT_EXACT", "CHAR_CLASS_WORD", "LITERAL"],
      layers: [
        {
          topic: "exact counts",
          traits: ["QUANT_EXACT", "CHAR_CLASS_WORD"],
          lines: [
            { text: "abc",         vital: true  },
            { text: "xyz",         vital: true  },
            { text: "ab",          vital: false },
            { text: "abcd",        vital: false },
            { text: "xy",          vital: false },
          ],
        },
        {
          topic: "ranged counts",
          traits: ["QUANT_EXACT", "LITERAL"],
          lines: [
            { text: "aaa",         vital: true  },
            { text: "aaaa",        vital: true  },
            { text: "aaaaa",       vital: true  },
            { text: "aa",          vital: false },
            { text: "aaaaaa",      vital: false },
          ],
        },
      ],
      heart: { text: "BRACE_HEART_3X" },
    },
  ],
};
