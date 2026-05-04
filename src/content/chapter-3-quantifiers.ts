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
      flavor: "Hits with zero or more punches.",
      layers: [
        {
          topic: "zero-or-more",
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
      flavor: "Demands at least one of you.",
      layers: [
        {
          topic: "one-or-more",
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
      flavor: "Optional, but oh so important.",
      layers: [
        {
          topic: "zero-or-one",
          lines: [
            { text: "color",       vital: true  },
            { text: "colour",      vital: true  },
            { text: "colors",      vital: false },
            { text: "colourful",   vital: false },
          ],
        },
        {
          topic: "optional groups",
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
      flavor: "Counts. Precisely. Don't be off by one.",
      layers: [
        {
          topic: "exact counts",
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
