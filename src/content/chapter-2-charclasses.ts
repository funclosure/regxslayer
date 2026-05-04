import type { Chapter } from "@/game/types";

export const chapter: Chapter = {
  id: "char-classes",
  title: "Character Classes",
  intro: "Letters, digits, whitespace, ranges. Stop spelling everything out.",
  cheatsheet: [
    "\\d  any digit       \\D  non-digit",
    "\\w  word char       \\W  non-word",
    "\\s  whitespace      \\S  non-ws",
    "[abc]  any of a,b,c  [^abc]  none of",
    "[a-z]  range",
  ],
  monsters: [
    {
      id: "digiton",
      name: "Digiton",
      portrait: "digiton",
      flavor: "Made entirely of digits. Ironic, isn't it.",
      layers: [
        {
          topic: "digits only",
          lines: [
            { text: "404",         vital: true  },
            { text: "200",         vital: true  },
            { text: "3.14",        vital: false },
            { text: "v3",          vital: false },
            { text: "abc",         vital: false },
          ],
        },
        {
          topic: "longer digit runs",
          lines: [
            { text: "8675309",     vital: true  },
            { text: "1024",        vital: true  },
            { text: "x42",         vital: false },
            { text: "12-12",       vital: false },
          ],
        },
      ],
      heart: { text: "DIGIT_BOSS_99" },
    },
    {
      id: "worderly",
      name: "Worderly",
      portrait: "worderly",
      flavor: "Fond of underscores. Probably writes Python.",
      layers: [
        {
          topic: "word chars",
          lines: [
            { text: "snake_case",  vital: true  },
            { text: "camelCase",   vital: true  },
            { text: "kebab-case",  vital: false },
            { text: "spaced out",  vital: false },
            { text: "punct!",      vital: false },
          ],
        },
        {
          topic: "non-word chars",
          lines: [
            { text: "@#!$",        vital: true  },
            { text: "...",         vital: true  },
            { text: "abc",         vital: false },
            { text: "ab_cd",       vital: false },
          ],
        },
      ],
      heart: { text: "WORD_SOUL_X" },
    },
    {
      id: "spaceblob",
      name: "Spaceblob",
      portrait: "spaceblob",
      flavor: "Soft, breathy, full of nothing.",
      layers: [
        {
          topic: "leading whitespace",
          lines: [
            { text: "    indented",      vital: true  },
            { text: "\tindented",        vital: true  },
            { text: "no_indent",         vital: false },
            { text: "x   trailing   ",   vital: false },
          ],
        },
        {
          topic: "non-whitespace runs",
          lines: [
            { text: "abc",               vital: true  },
            { text: "xyz123",            vital: true  },
            { text: "  spaces  inside",  vital: false },
            { text: "  ",                vital: false },
          ],
        },
      ],
      heart: { text: "VOID_TOKEN" },
    },
    {
      id: "rangewolf",
      name: "Rangewolf",
      portrait: "rangewolf",
      flavor: "Hunts in lowercase territory.",
      layers: [
        {
          topic: "lowercase only",
          lines: [
            { text: "lowercase",       vital: true  },
            { text: "another",         vital: true  },
            { text: "Capitalized",     vital: false },
            { text: "MIXED1",          vital: false },
            { text: "x42",             vital: false },
          ],
        },
        {
          topic: "negated set",
          lines: [
            { text: "alpha",           vital: true  },
            { text: "beta",            vital: true  },
            { text: "alpha_x",         vital: false },
            { text: "beta-99",         vital: false },
          ],
        },
      ],
      heart: { text: "RANGE_FANG_07" },
    },
  ],
};
