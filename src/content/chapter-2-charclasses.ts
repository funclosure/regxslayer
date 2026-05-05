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
      pool: "story",
      flavor: "Made entirely of digits. Ironic, isn't it.",
      traits: ["CHAR_CLASS_DIGIT", "QUANT_PLUS", "QUANT_EXACT"],
      layers: [
        {
          topic: "digits only",
          traits: ["CHAR_CLASS_DIGIT", "QUANT_PLUS"],
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
          traits: ["CHAR_CLASS_DIGIT", "QUANT_EXACT"],
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
      pool: "story",
      flavor: "Fond of underscores. Probably writes Python.",
      traits: ["CHAR_CLASS_WORD", "QUANT_PLUS"],
      layers: [
        {
          topic: "word chars",
          traits: ["CHAR_CLASS_WORD", "QUANT_PLUS"],
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
          traits: ["CHAR_CLASS_WORD", "QUANT_PLUS"],
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
      pool: "story",
      flavor: "Soft, breathy, full of nothing.",
      traits: ["CHAR_CLASS_SPACE", "ANCHOR_START", "QUANT_PLUS"],
      layers: [
        {
          topic: "leading whitespace",
          traits: ["CHAR_CLASS_SPACE", "ANCHOR_START"],
          lines: [
            { text: "    indented",      vital: true  },
            { text: "\tindented",        vital: true  },
            { text: "no_indent",         vital: false },
            { text: "x   trailing   ",   vital: false },
          ],
        },
        {
          topic: "non-whitespace runs",
          traits: ["CHAR_CLASS_SPACE", "QUANT_PLUS"],
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
      pool: "story",
      flavor: "Hunts in lowercase territory.",
      traits: ["CHAR_CLASS_RANGE", "CHAR_CLASS_SET", "QUANT_PLUS"],
      layers: [
        {
          topic: "lowercase only",
          traits: ["CHAR_CLASS_RANGE", "QUANT_PLUS"],
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
          traits: ["CHAR_CLASS_SET", "QUANT_PLUS"],
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
